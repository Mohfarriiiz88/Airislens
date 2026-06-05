import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

export type AdminBookingStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

type BookingStatusDb = "pending" | "confirmed" | "completed" | "cancelled";

type BookingRow = RowDataPacket & {
  id: number;
  order_id: string;
  photographer_user_id: number;
  customer_user_id: number | null;
  package_id: number | null;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  amount: number;
  booking_date: string;
  booking_time: string;
  location: string;
  note: string;
  status: BookingStatusDb;
  created_at: Date | string;
};

declare global {
  var __airislensBookingSchemaReady: Promise<void> | undefined;
  var __airislensBookingSchemaVersion: number | undefined;
}

const BOOKING_SCHEMA_VERSION = 2;

export type AdminBooking = {
  id: number;
  orderId: string;
  photographerUserId: number;
  customerUserId: number | null;
  packageId: number | null;
  customerName: string;
  customerPhone: string;
  packageName: string;
  amount: number;
  bookingDate: string;
  bookingTime: string;
  location: string;
  note: string;
  status: AdminBookingStatus;
  createdAt: string;
};

export type CreateBookingInput = {
  orderId: string;
  photographerUserId: number;
  customerUserId?: number | null;
  packageId?: number | null;
  customerName: string;
  customerPhone: string;
  packageName: string;
  amount: number;
  bookingDate: string;
  bookingTime: string;
  location?: string;
  note?: string;
  status?: AdminBookingStatus;
};

export type BookingDashboardSnapshot = {
  totalBookings: number;
  todayBookings: number;
  monthBookings: number;
  totalRevenue: number;
  statusBreakdown: Record<AdminBookingStatus, number>;
  recentBookings: AdminBooking[];
  upcomingBookings: AdminBooking[];
};

export type UserBookingHistoryItem = {
  id: number;
  orderId: string;
  photographerName: string;
  bookingDate: string;
  bookingTime: string;
  amount: number;
  location: string;
  status: AdminBookingStatus;
};

export type BookingCalendarItem = {
  id: number;
  orderId: string;
  customerName: string;
  packageName: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  status: AdminBookingStatus;
};

function mapStatusFromDb(status: BookingStatusDb): AdminBookingStatus {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "pending":
    default:
      return "Pending";
  }
}

function mapStatusToDb(status: AdminBookingStatus): BookingStatusDb {
  switch (status) {
    case "Confirmed":
      return "confirmed";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "Pending":
    default:
      return "pending";
  }
}

function normalizeBooking(row: BookingRow): AdminBooking {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();

  return {
    id: row.id,
    orderId: row.order_id,
    photographerUserId: row.photographer_user_id,
    customerUserId: row.customer_user_id,
    packageId: row.package_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    packageName: row.package_name,
    amount: Number(row.amount),
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    location: row.location,
    note: row.note,
    status: mapStatusFromDb(row.status),
    createdAt,
  };
}

function getTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCurrentMonthPrefix() {
  return getTodayDateString().slice(0, 7);
}

async function ensureBookingSchemaInternal() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(64) NOT NULL,
      photographer_user_id BIGINT UNSIGNED NOT NULL,
      customer_user_id BIGINT UNSIGNED NULL,
      package_id BIGINT UNSIGNED NULL,
      customer_name VARCHAR(191) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      package_name VARCHAR(191) NOT NULL,
      amount BIGINT UNSIGNED NOT NULL,
      booking_date DATE NOT NULL,
      booking_time VARCHAR(10) NOT NULL,
      location TEXT NOT NULL,
      note TEXT NOT NULL,
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY bookings_order_id_unique (order_id),
      KEY bookings_photographer_user_id_idx (photographer_user_id),
      KEY bookings_customer_user_id_idx (customer_user_id),
      KEY bookings_booking_date_idx (booking_date),
      KEY bookings_status_idx (status)
    )
  `);

  const [customerUserIdRows] = await pool.execute<
    (RowDataPacket & { COLUMN_NAME: string })[]
  >(
    `
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND COLUMN_NAME = 'customer_user_id'
      LIMIT 1
    `
  );

  if (customerUserIdRows.length === 0) {
    await pool.execute(`
      ALTER TABLE bookings
      ADD COLUMN customer_user_id BIGINT UNSIGNED NULL AFTER photographer_user_id
    `);
  }

  const [customerUserIdIndexRows] = await pool.execute<
    (RowDataPacket & { INDEX_NAME: string })[]
  >(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND INDEX_NAME = 'bookings_customer_user_id_idx'
      LIMIT 1
    `
  );

  if (customerUserIdIndexRows.length === 0) {
    await pool.execute(`
      ALTER TABLE bookings
      ADD KEY bookings_customer_user_id_idx (customer_user_id)
    `);
  }
}

export async function ensureBookingSchema() {
  if (
    !global.__airislensBookingSchemaReady ||
    global.__airislensBookingSchemaVersion !== BOOKING_SCHEMA_VERSION
  ) {
    global.__airislensBookingSchemaReady = ensureBookingSchemaInternal().catch(
      (error) => {
        global.__airislensBookingSchemaReady = undefined;
        global.__airislensBookingSchemaVersion = undefined;
        throw error;
      }
    );
    global.__airislensBookingSchemaVersion = BOOKING_SCHEMA_VERSION;
  }

  return global.__airislensBookingSchemaReady;
}

export async function createBooking(input: CreateBookingInput) {
  await ensureBookingSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO bookings (
        order_id,
        photographer_user_id,
        customer_user_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        booking_date,
        booking_time,
        location,
        note,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.orderId,
      input.photographerUserId,
      input.customerUserId ?? null,
      input.packageId ?? null,
      input.customerName.trim(),
      input.customerPhone.trim(),
      input.packageName.trim(),
      input.amount,
      input.bookingDate,
      input.bookingTime.trim(),
      input.location?.trim() ?? "",
      input.note?.trim() ?? "",
      mapStatusToDb(input.status ?? "Pending"),
    ]
  );

  return Number(result.insertId);
}

export async function updateAdminBookingStatus(
  userId: number,
  bookingId: number,
  status: AdminBookingStatus
) {
  await ensureBookingSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET status = ?
      WHERE id = ?
        AND photographer_user_id = ?
      LIMIT 1
    `,
    [mapStatusToDb(status), bookingId, userId]
  );

  return result.affectedRows > 0;
}

export async function updateBookingStatusByOrderId(
  orderId: string,
  status: AdminBookingStatus
) {
  await ensureBookingSchema();

  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return false;
  }

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET status = ?
      WHERE order_id = ?
      LIMIT 1
    `,
    [mapStatusToDb(status), normalizedOrderId]
  );

  return result.affectedRows > 0;
}

export async function listAdminBookings(userId: number, limit?: number) {
  await ensureBookingSchema();

  const pool = getDbPool();
  const safeLimit =
    typeof limit === "number" && Number.isInteger(limit) && limit > 0
      ? limit
      : null;
  const limitClause = safeLimit ? `LIMIT ${safeLimit}` : "";

  const [rows] = await pool.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        location,
        note,
        status,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
      ORDER BY booking_date DESC, booking_time DESC, id DESC
      ${limitClause}
    `,
    [userId]
  );

  return rows.map(normalizeBooking);
}

export async function getBookingDashboardSnapshot(
  userId: number
): Promise<BookingDashboardSnapshot> {
  await ensureBookingSchema();

  const pool = getDbPool();
  const today = getTodayDateString();
  const monthPrefix = getCurrentMonthPrefix();

  const [aggregateRows] = await pool.execute<
    (RowDataPacket & {
      total_bookings: number;
      today_bookings: number;
      month_bookings: number;
      total_revenue: number | null;
      pending_count: number;
      confirmed_count: number;
      completed_count: number;
      cancelled_count: number;
    })[]
  >(
    `
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN booking_date = ? THEN 1 ELSE 0 END) AS today_bookings,
        SUM(CASE WHEN DATE_FORMAT(booking_date, '%Y-%m') = ? THEN 1 ELSE 0 END) AS month_bookings,
        SUM(CASE WHEN status <> 'cancelled' THEN amount ELSE 0 END) AS total_revenue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM bookings
      WHERE photographer_user_id = ?
    `,
    [today, monthPrefix, userId]
  );

  const [recentRows] = await pool.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        location,
        note,
        status,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `,
    [userId]
  );

  const [upcomingRows] = await pool.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        location,
        note,
        status,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date >= ?
        AND status IN ('pending', 'confirmed')
      ORDER BY booking_date ASC, booking_time ASC, id ASC
      LIMIT 5
    `,
    [userId, today]
  );

  const aggregate = aggregateRows[0];

  return {
    totalBookings: Number(aggregate?.total_bookings ?? 0),
    todayBookings: Number(aggregate?.today_bookings ?? 0),
    monthBookings: Number(aggregate?.month_bookings ?? 0),
    totalRevenue: Number(aggregate?.total_revenue ?? 0),
    statusBreakdown: {
      Pending: Number(aggregate?.pending_count ?? 0),
      Confirmed: Number(aggregate?.confirmed_count ?? 0),
      Completed: Number(aggregate?.completed_count ?? 0),
      Cancelled: Number(aggregate?.cancelled_count ?? 0),
    },
    recentBookings: recentRows.map(normalizeBooking),
    upcomingBookings: upcomingRows.map(normalizeBooking),
  };
}

export async function listUserBookingHistory(userId: number) {
  await ensureBookingSchema();

  const pool = getDbPool();
  const query = `
    SELECT
      b.id,
      b.order_id,
      b.photographer_user_id,
      b.customer_user_id,
      b.package_id,
      b.customer_name,
      b.customer_phone,
      b.package_name,
      b.amount,
      DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      b.booking_time,
      b.location,
      b.note,
      b.status,
      b.created_at,
      COALESCE(NULLIF(p.brand_name, ''), u.name) AS photographer_name
    FROM bookings b
    LEFT JOIN partner_profiles p ON p.user_id = b.photographer_user_id
    LEFT JOIN users u ON u.id = b.photographer_user_id
    WHERE b.customer_user_id = ?
    ORDER BY b.booking_date DESC, b.booking_time DESC, b.id DESC
  `;

  let rows:
    | (BookingRow & {
        photographer_name: string | null;
      })[]
    | undefined;

  try {
    const [result] = await pool.execute<
      (BookingRow & {
        photographer_name: string | null;
      })[]
    >(query, [userId]);
    rows = result;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !String(error.message).includes("customer_user_id")
    ) {
      throw error;
    }

    global.__airislensBookingSchemaReady = undefined;
    global.__airislensBookingSchemaVersion = undefined;
    await ensureBookingSchema();

    const [retryResult] = await pool.execute<
      (BookingRow & {
        photographer_name: string | null;
      })[]
    >(query, [userId]);
    rows = retryResult;
  }

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    photographerName: row.photographer_name || "Photographer",
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    amount: Number(row.amount),
    location: row.location,
    status: mapStatusFromDb(row.status),
  }));
}

export async function listAdminBookingsByDate(userId: number, date: string) {
  await ensureBookingSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        location,
        note,
        status,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date = ?
      ORDER BY booking_time ASC, id ASC
    `,
    [userId, date]
  );

  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    customerName: row.customer_name,
    packageName: row.package_name,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    location: row.location,
    status: mapStatusFromDb(row.status),
  })) satisfies BookingCalendarItem[];
}
