import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import {
  calculateBookingEndTime,
  DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES,
  parsePackageDurationToMinutes,
} from "@/lib/booking-time";
import {
  getBookingLifecycleLabel,
  getBookingLifecycleStatus,
  type AdminBooking,
  type AdminBookingStatus,
  type BookingCalendarItem,
  type BookingDashboardSnapshot,
  type UserBookingHistoryItem,
} from "@/lib/bookings.shared";
import { getDbPool } from "@/lib/db";
import { ensurePartnerCmsSchema } from "@/lib/partner-cms";
import { getServiceFeeRatePercent } from "@/lib/service-fee";
export {
  ALL_ADMIN_BOOKING_STATUSES,
  getAdminBookingStatusLabel,
  getBookingLifecycleLabel,
  getBookingLifecycleStatus,
} from "@/lib/bookings.shared";
export type {
  AdminBooking,
  AdminBookingStatus,
  BookingCalendarItem,
  BookingDashboardSnapshot,
  BookingLifecycleStatus,
  UserBookingHistoryItem,
} from "@/lib/bookings.shared";

type BookingStatusDb =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

type DbExecutor = Pool | PoolConnection;

type BookingRow = RowDataPacket & {
  id: number;
  order_id: string;
  photographer_user_id: number;
  customer_user_id: number | null;
  category_id: number | null;
  package_id: number | null;
  customer_name: string;
  customer_phone: string;
  package_name: string;
  amount: number;
  booking_date: string;
  booking_time: string;
  booking_end_time: string | null;
  location: string;
  event_address: string | null;
  event_latitude: number | null;
  event_longitude: number | null;
  distance_km: number;
  transport_fee: number;
  package_price: number | null;
  service_fee_rate: number;
  service_fee: number;
  total_price: number | null;
  note: string;
  status: BookingStatusDb;
  service_completed_at?: Date | string | null;
  customer_confirmed_at?: Date | string | null;
  cancelled_at?: Date | string | null;
  cancel_reason?: string | null;
  created_at: Date | string;
};

declare global {
  var __airislensBookingSchemaReady: Promise<void> | undefined;
  var __airislensBookingSchemaVersion: number | undefined;
}

const BOOKING_SCHEMA_VERSION = 9;

const BOOKING_STATUS_ENUM_VALUES = [
  "pending_payment",
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
] as const satisfies BookingStatusDb[];

const BOOKING_ACTIVE_DB_STATUSES = [
  "pending_payment",
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "disputed",
] as const satisfies BookingStatusDb[];

const BOOKING_CANCELLABLE_DB_STATUSES = [
  "pending_payment",
  "confirmed",
] as const satisfies BookingStatusDb[];

const BOOKING_UPCOMING_DB_STATUSES = [
  "pending_payment",
  "confirmed",
  "in_progress",
] as const satisfies BookingStatusDb[];

const BOOKING_AWAITING_CUSTOMER_CONFIRMATION_DB_STATUSES = [
  "awaiting_confirmation",
  "completed",
] as const satisfies BookingStatusDb[];

const BOOKING_STATUS_ENUM_SQL = BOOKING_STATUS_ENUM_VALUES.map(
  (value) => `'${value}'`
).join(", ");

const BOOKING_STATUS_ENUM_WITH_LEGACY_PENDING_SQL = [
  "'pending'",
  ...BOOKING_STATUS_ENUM_VALUES.map((value) => `'${value}'`),
].join(", ");

function toSqlList(values: readonly string[]) {
  return values.map((value) => `'${value}'`).join(", ");
}

function isBookingCancellableDbStatus(status: BookingStatusDb) {
  return status === "pending_payment" || status === "confirmed";
}

function isBookingAwaitingCustomerConfirmationDbStatus(
  status: BookingStatusDb
) {
  return status === "awaiting_confirmation" || status === "completed";
}

function getBookingStatusProgressRank(status: BookingStatusDb) {
  switch (status) {
    case "pending_payment":
      return 0;
    case "confirmed":
      return 1;
    case "in_progress":
      return 2;
    case "awaiting_confirmation":
      return 3;
    case "completed":
      return 4;
    default:
      return null;
  }
}

function resolveBookingStatusForDatabaseUpdate(
  currentStatus: BookingStatusDb,
  requestedStatus: BookingStatusDb
) {
  if (currentStatus === requestedStatus) {
    return currentStatus;
  }

  if (requestedStatus === "refunded") {
    return "refunded" satisfies BookingStatusDb;
  }

  if (requestedStatus === "disputed") {
    return currentStatus === "refunded" ? currentStatus : "disputed";
  }

  if (requestedStatus === "cancelled") {
    if (
      currentStatus === "refunded" ||
      currentStatus === "disputed" ||
      currentStatus === "completed"
    ) {
      return currentStatus;
    }

    return "cancelled" satisfies BookingStatusDb;
  }

  const currentRank = getBookingStatusProgressRank(currentStatus);
  const requestedRank = getBookingStatusProgressRank(requestedStatus);

  if (currentRank === null || requestedRank === null) {
    return currentStatus;
  }

  return requestedRank > currentRank ? requestedStatus : currentStatus;
}

export type CreateBookingInput = {
  orderId: string;
  photographerUserId: number;
  customerUserId?: number | null;
  categoryId?: number | null;
  packageId?: number | null;
  customerName: string;
  customerPhone: string;
  packageName: string;
  amount: number;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime?: string | null;
  location?: string;
  eventAddress?: string;
  eventLatitude?: number | null;
  eventLongitude?: number | null;
  distanceKm?: number;
  transportFee?: number;
  packagePrice?: number | null;
  serviceFeeRate?: number;
  serviceFee?: number;
  totalPrice?: number | null;
  note?: string;
  status?: AdminBookingStatus;
};

export class BookingSlotUnavailableError extends Error {
  constructor() {
    super("Jadwal tidak tersedia untuk durasi paket yang dipilih.");
    this.name = "BookingSlotUnavailableError";
  }
}

function mapStatusFromDb(status: BookingStatusDb): AdminBookingStatus {
  switch (status) {
    case "pending_payment":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "in_progress":
      return "InProgress";
    case "awaiting_confirmation":
      return "AwaitingConfirmation";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "disputed":
      return "Disputed";
    case "refunded":
      return "Refunded";
    default:
      return "Pending";
  }
}

function mapStatusToDb(status: AdminBookingStatus): BookingStatusDb {
  switch (status) {
    case "Pending":
      return "pending_payment";
    case "Confirmed":
      return "confirmed";
    case "InProgress":
      return "in_progress";
    case "AwaitingConfirmation":
      return "awaiting_confirmation";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "Disputed":
      return "disputed";
    case "Refunded":
      return "refunded";
    default:
      return "pending_payment";
  }
}

function getExecutor(connection?: PoolConnection) {
  return (connection ?? getDbPool()) as DbExecutor;
}

function getFallbackBookingEndTime(
  bookingTime: string,
  bookingEndTime?: string | null
) {
  if (bookingEndTime) {
    return bookingEndTime;
  }

  return calculateBookingEndTime(
    bookingTime,
    DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
  );
}

function normalizeTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeBooking(row: BookingRow): AdminBooking {
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();
  const serviceCompletedAt = normalizeTimestamp(row.service_completed_at);
  const customerConfirmedAt = normalizeTimestamp(row.customer_confirmed_at);
  const cancelledAt = normalizeTimestamp(row.cancelled_at);
  const lifecycleStatus = getBookingLifecycleStatus({
    status: mapStatusFromDb(row.status),
    customerConfirmedAt,
  });

  return {
    id: row.id,
    orderId: row.order_id,
    photographerUserId: row.photographer_user_id,
    customerUserId: row.customer_user_id,
    categoryId: row.category_id === null ? null : Number(row.category_id),
    packageId: row.package_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    packageName: row.package_name,
    amount: Number(row.amount),
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    bookingEndTime: row.booking_end_time,
    location: row.location,
    eventAddress: row.event_address,
    eventLatitude:
      row.event_latitude === null ? null : Number(row.event_latitude),
    eventLongitude:
      row.event_longitude === null ? null : Number(row.event_longitude),
    distanceKm: Number(row.distance_km ?? 0),
    transportFee: Number(row.transport_fee ?? 0),
    packagePrice:
      row.package_price === null ? null : Number(row.package_price),
    serviceFeeRate: Number(row.service_fee_rate ?? getServiceFeeRatePercent()),
    serviceFee: Number(row.service_fee ?? 0),
    totalPrice: row.total_price === null ? null : Number(row.total_price),
    note: row.note,
    status: mapStatusFromDb(row.status),
    lifecycleStatus,
    lifecycleStatusLabel: getBookingLifecycleLabel(lifecycleStatus),
    serviceCompletedAt,
    customerConfirmedAt,
    cancelledAt,
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

async function lockPartnerQuota(
  connection: PoolConnection,
  photographerUserId: number
) {
  const [profileRows] = await connection.execute<
    (RowDataPacket & { team_quota: number | null })[]
  >(
    `
      SELECT team_quota
      FROM partner_profiles
      WHERE user_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [photographerUserId]
  );

  if (profileRows.length === 0) {
    await connection.execute(
      `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [photographerUserId]
    );
  }

  const quota = Number(profileRows[0]?.team_quota ?? 1);
  return Number.isInteger(quota) && quota > 0 ? quota : 1;
}

async function countActiveBookingsForUpdate(
  connection: PoolConnection,
  photographerUserId: number,
  bookingDate: string,
  bookingTime: string,
  bookingEndTime: string
) {
  const [rows] = await connection.execute<
    (RowDataPacket & { id: number })[]
  >(
    `
      SELECT id
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date = ?
        AND TIME(booking_time) < TIME(?)
        AND COALESCE(
          booking_end_time,
          ADDTIME(TIME(booking_time), '01:00:00')
        ) > TIME(?)
        AND status IN (${toSqlList(BOOKING_ACTIVE_DB_STATUSES)})
      FOR UPDATE
    `,
    [photographerUserId, bookingDate, bookingEndTime, bookingTime]
  );

  return rows.length;
}

async function ensureBookingSchemaInternal() {
  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id VARCHAR(64) NOT NULL,
      photographer_user_id BIGINT UNSIGNED NOT NULL,
      customer_user_id BIGINT UNSIGNED NULL,
      category_id BIGINT UNSIGNED NULL,
      package_id BIGINT UNSIGNED NULL,
      customer_name VARCHAR(191) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      package_name VARCHAR(191) NOT NULL,
      amount BIGINT UNSIGNED NOT NULL,
      booking_date DATE NOT NULL,
      booking_time VARCHAR(10) NOT NULL,
      booking_end_time TIME NULL,
      location TEXT NOT NULL,
      event_address TEXT NULL,
      event_latitude DECIMAL(10,8) NULL,
      event_longitude DECIMAL(11,8) NULL,
      distance_km DECIMAL(8,2) NOT NULL DEFAULT 0,
      transport_fee BIGINT UNSIGNED NOT NULL DEFAULT 0,
      package_price BIGINT UNSIGNED NULL,
      service_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00,
      service_fee INT UNSIGNED NOT NULL DEFAULT 0,
      total_price BIGINT UNSIGNED NULL,
      note TEXT NOT NULL,
      status ENUM(${BOOKING_STATUS_ENUM_SQL}) NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY bookings_order_id_unique (order_id),
      KEY bookings_photographer_user_id_idx (photographer_user_id),
      KEY bookings_customer_user_id_idx (customer_user_id),
      KEY bookings_category_id_idx (category_id),
      KEY bookings_booking_date_idx (booking_date),
      KEY bookings_status_idx (status)
    )
  `);

  const bookingColumns = [
    {
      name: "category_id",
      definition: "BIGINT UNSIGNED NULL AFTER customer_user_id",
    },
    {
      name: "booking_end_time",
      definition: "TIME NULL AFTER booking_time",
    },
    {
      name: "event_address",
      definition: "TEXT NULL AFTER location",
    },
    {
      name: "event_latitude",
      definition: "DECIMAL(10,8) NULL AFTER event_address",
    },
    {
      name: "event_longitude",
      definition: "DECIMAL(11,8) NULL AFTER event_latitude",
    },
    {
      name: "distance_km",
      definition: "DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER event_longitude",
    },
    {
      name: "transport_fee",
      definition: "BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER distance_km",
    },
    {
      name: "package_price",
      definition: "BIGINT UNSIGNED NULL AFTER transport_fee",
    },
    {
      name: "service_fee_rate",
      definition: "DECIMAL(5,2) NOT NULL DEFAULT 3.00 AFTER package_price",
    },
    {
      name: "service_fee",
      definition: "INT UNSIGNED NOT NULL DEFAULT 0 AFTER service_fee_rate",
    },
    {
      name: "total_price",
      definition: "BIGINT UNSIGNED NULL AFTER service_fee",
    },
    {
      name: "service_completed_at",
      definition: "TIMESTAMP NULL DEFAULT NULL AFTER status",
    },
    {
      name: "customer_confirmed_at",
      definition: "TIMESTAMP NULL DEFAULT NULL AFTER service_completed_at",
    },
    {
      name: "cancelled_at",
      definition: "TIMESTAMP NULL DEFAULT NULL AFTER customer_confirmed_at",
    },
    {
      name: "cancel_reason",
      definition: "TEXT NULL AFTER cancelled_at",
    },
  ] as const;

  for (const column of bookingColumns) {
    const [rows] = await pool.execute<(RowDataPacket & { COLUMN_NAME: string })[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [column.name]
    );

    if (rows.length === 0) {
      await pool.execute(`
        ALTER TABLE bookings
        ADD COLUMN ${column.name} ${column.definition}
      `);
    }
  }

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

  const [categoryIdIndexRows] = await pool.execute<
    (RowDataPacket & { INDEX_NAME: string })[]
  >(
    `
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND INDEX_NAME = 'bookings_category_id_idx'
      LIMIT 1
    `
  );

  if (categoryIdIndexRows.length === 0) {
    await pool.execute(`
      ALTER TABLE bookings
      ADD KEY bookings_category_id_idx (category_id)
    `);
  }

  const [statusColumnRows] = await pool.execute<
    (RowDataPacket & {
      COLUMN_TYPE: string;
      COLUMN_DEFAULT: string | null;
    })[]
  >(
    `
      SELECT COLUMN_TYPE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND COLUMN_NAME = 'status'
      LIMIT 1
    `
  );

  const statusColumn = statusColumnRows[0];
  const currentStatusColumnType = String(statusColumn?.COLUMN_TYPE ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const currentStatusDefault = statusColumn?.COLUMN_DEFAULT ?? null;
  const finalStatusColumnType = `enum(${BOOKING_STATUS_ENUM_SQL})`.replace(
    /\s+/g,
    ""
  );

  if (
    currentStatusColumnType !== finalStatusColumnType ||
    currentStatusDefault !== "pending_payment"
  ) {
    await pool.execute(`
      ALTER TABLE bookings
      MODIFY COLUMN status ENUM(${BOOKING_STATUS_ENUM_WITH_LEGACY_PENDING_SQL}) NOT NULL DEFAULT 'pending_payment'
    `);

    await pool.execute(`
      UPDATE bookings
      SET status = CASE
        WHEN status = 'pending' THEN 'pending_payment'
        WHEN status = 'completed' AND customer_confirmed_at IS NULL THEN 'awaiting_confirmation'
        ELSE status
      END
      WHERE status = 'pending'
         OR (status = 'completed' AND customer_confirmed_at IS NULL)
    `);

    await pool.execute(`
      ALTER TABLE bookings
      MODIFY COLUMN status ENUM(${BOOKING_STATUS_ENUM_SQL}) NOT NULL DEFAULT 'pending_payment'
    `);
  }

  await ensurePartnerCmsSchema();
  await pool.execute(`
    UPDATE bookings b
    INNER JOIN partner_packages pkg
      ON pkg.id = b.package_id
    SET b.category_id = pkg.category_id
    WHERE b.category_id IS NULL
      AND b.package_id IS NOT NULL
      AND pkg.category_id IS NOT NULL
  `);

  const [bookingEndTimeRows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      booking_time: string;
      duration: string | null;
    })[]
  >(
    `
      SELECT
        b.id,
        b.booking_time,
        pkg.duration
      FROM bookings b
      LEFT JOIN partner_packages pkg
        ON pkg.id = b.package_id
      WHERE b.booking_end_time IS NULL
    `
  );

  for (const row of bookingEndTimeRows) {
    let durationMinutes = DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES;

    if (row.duration) {
      try {
        durationMinutes = parsePackageDurationToMinutes(row.duration);
      } catch {
        durationMinutes = DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES;
      }
    }

    const bookingEndTime = calculateBookingEndTime(
      row.booking_time,
      durationMinutes,
      {
        allowOverflowHours: true,
      }
    );

    await pool.execute(
      `
        UPDATE bookings
        SET booking_end_time = ?
        WHERE id = ?
          AND booking_end_time IS NULL
      `,
      [bookingEndTime, row.id]
    );
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

async function insertBooking(
  connection: PoolConnection,
  input: CreateBookingInput
) {
  const teamQuota = await lockPartnerQuota(connection, input.photographerUserId);
  const bookingEndTime = getFallbackBookingEndTime(
    input.bookingTime.trim(),
    input.bookingEndTime
  );
  const activeBookingCount = await countActiveBookingsForUpdate(
    connection,
    input.photographerUserId,
    input.bookingDate,
    input.bookingTime.trim(),
    bookingEndTime
  );

  if (activeBookingCount >= teamQuota) {
    throw new BookingSlotUnavailableError();
  }

  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO bookings (
        order_id,
        photographer_user_id,
        customer_user_id,
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        booking_date,
        booking_time,
        booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.orderId,
      input.photographerUserId,
      input.customerUserId ?? null,
      input.categoryId ?? null,
      input.packageId ?? null,
      input.customerName.trim(),
      input.customerPhone.trim(),
      input.packageName.trim(),
      input.amount,
      input.bookingDate,
      input.bookingTime.trim(),
      bookingEndTime,
      input.location?.trim() ?? input.eventAddress?.trim() ?? "",
      input.eventAddress?.trim() ?? null,
      input.eventLatitude ?? null,
      input.eventLongitude ?? null,
      input.distanceKm ?? 0,
      input.transportFee ?? 0,
      input.packagePrice ?? null,
      input.serviceFeeRate ?? getServiceFeeRatePercent(),
      input.serviceFee ?? 0,
      input.totalPrice ?? input.amount,
      input.note?.trim() ?? "",
      mapStatusToDb(input.status ?? "Pending"),
    ]
  );

  return Number(result.insertId);
}

export async function createBooking(
  input: CreateBookingInput,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  if (connection) {
    return insertBooking(connection, input);
  }

  const pool = getDbPool();
  const managedConnection = await pool.getConnection();

  try {
    await managedConnection.beginTransaction();
    const bookingId = await insertBooking(managedConnection, input);
    await managedConnection.commit();
    return bookingId;
  } catch (error) {
    await managedConnection.rollback();
    throw error;
  } finally {
    managedConnection.release();
  }
}

export async function updateAdminBookingStatus(
  userId: number,
  bookingId: number,
  status: AdminBookingStatus,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const executor = getExecutor(connection);
  const nextStatus = mapStatusToDb(status);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET
        status = ?,
        service_completed_at = CASE
          WHEN ? IN ('awaiting_confirmation', 'completed')
            THEN COALESCE(service_completed_at, CURRENT_TIMESTAMP)
          ELSE service_completed_at
        END,
        customer_confirmed_at = CASE
          WHEN ? = 'completed' THEN COALESCE(customer_confirmed_at, CURRENT_TIMESTAMP)
          ELSE customer_confirmed_at
        END,
        cancelled_at = CASE
          WHEN ? IN ('cancelled', 'refunded')
            THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP)
          ELSE cancelled_at
        END
      WHERE id = ?
        AND photographer_user_id = ?
      LIMIT 1
    `,
    [nextStatus, nextStatus, nextStatus, nextStatus, bookingId, userId]
  );

  return result.affectedRows > 0;
}

export async function getAdminBookingById(
  userId: number,
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
        cancel_reason,
        created_at
      FROM bookings
      WHERE id = ?
        AND photographer_user_id = ?
      LIMIT 1
    `,
    [bookingId, userId]
  );

  return rows[0] ? normalizeBooking(rows[0]) : null;
}

export async function updateBookingStatusByOrderId(
  orderId: string,
  status: AdminBookingStatus,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return false;
  }

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<
    (RowDataPacket & { status: BookingStatusDb })[]
  >(
    `
      SELECT status
      FROM bookings
      WHERE order_id = ?
      LIMIT 1
    `,
    [normalizedOrderId]
  );

  const currentStatus = rows[0]?.status;

  if (!currentStatus) {
    return false;
  }

  const nextStatus = resolveBookingStatusForDatabaseUpdate(
    currentStatus,
    mapStatusToDb(status)
  );

  if (nextStatus === currentStatus) {
    return true;
  }

  const [result] = await executor.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET
        status = ?,
        service_completed_at = CASE
          WHEN ? IN ('awaiting_confirmation', 'completed')
            THEN COALESCE(service_completed_at, CURRENT_TIMESTAMP)
          ELSE service_completed_at
        END,
        customer_confirmed_at = CASE
          WHEN ? = 'completed' THEN COALESCE(customer_confirmed_at, CURRENT_TIMESTAMP)
          ELSE customer_confirmed_at
        END,
        cancelled_at = CASE
          WHEN ? IN ('cancelled', 'refunded')
            THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP)
          ELSE cancelled_at
        END
      WHERE order_id = ?
      LIMIT 1
    `,
    [nextStatus, nextStatus, nextStatus, nextStatus, normalizedOrderId]
  );

  return result.affectedRows > 0;
}

export async function getUserBookingById(
  userId: number,
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
        cancel_reason,
        created_at
      FROM bookings
      WHERE id = ?
        AND customer_user_id = ?
      LIMIT 1
    `,
    [bookingId, userId]
  );

  return rows[0] ? normalizeBooking(rows[0]) : null;
}

export async function markCustomerBookingConfirmed(
  userId: number,
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const executor = getExecutor(connection);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET
        status = 'completed',
        customer_confirmed_at = COALESCE(customer_confirmed_at, CURRENT_TIMESTAMP)
      WHERE id = ?
        AND customer_user_id = ?
        AND status IN (${toSqlList(
          BOOKING_AWAITING_CUSTOMER_CONFIRMATION_DB_STATUSES
        )})
      LIMIT 1
    `,
    [bookingId, userId]
  );

  return result.affectedRows > 0;
}

export async function cancelUserBooking(
  userId: number,
  bookingId: number,
  reason?: string | null,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const executor = getExecutor(connection);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET
        status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP),
        cancel_reason = ?
      WHERE id = ?
        AND customer_user_id = ?
        AND status IN (${toSqlList(BOOKING_CANCELLABLE_DB_STATUSES)})
      LIMIT 1
    `,
    [reason?.trim() || "Dibatalkan oleh customer.", bookingId, userId]
  );

  return result.affectedRows > 0;
}

export async function getBookingByOrderId(
  orderId: string,
  connection?: PoolConnection
) {
  await ensureBookingSchema();

  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingRow[]>(
    `
      SELECT
        id,
        order_id,
        photographer_user_id,
        customer_user_id,
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
        created_at
      FROM bookings
      WHERE order_id = ?
      LIMIT 1
    `,
    [normalizedOrderId]
  );

  return rows[0] ? normalizeBooking(rows[0]) : null;
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
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
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
      awaiting_payment_count: number;
      scheduled_count: number;
      awaiting_customer_confirmation_count: number;
      completed_count: number;
      cancelled_count: number;
    })[]
  >(
    `
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN booking_date = ? THEN 1 ELSE 0 END) AS today_bookings,
        SUM(CASE WHEN DATE_FORMAT(booking_date, '%Y-%m') = ? THEN 1 ELSE 0 END) AS month_bookings,
        SUM(
          CASE
            WHEN status NOT IN ('cancelled', 'refunded') THEN GREATEST(
              COALESCE(package_price, 0) + COALESCE(transport_fee, 0),
              GREATEST(COALESCE(total_price, amount) - COALESCE(service_fee, 0), 0)
            )
            ELSE 0
          END
        ) AS total_revenue,
        SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS awaiting_payment_count,
        SUM(CASE WHEN status IN ('confirmed', 'in_progress') THEN 1 ELSE 0 END) AS scheduled_count,
        SUM(
          CASE
            WHEN status = 'awaiting_confirmation' THEN 1
            WHEN status = 'completed' AND customer_confirmed_at IS NULL THEN 1
            ELSE 0
          END
        ) AS awaiting_customer_confirmation_count,
        SUM(
          CASE
            WHEN status = 'completed' AND customer_confirmed_at IS NOT NULL THEN 1
            ELSE 0
          END
        ) AS completed_count,
        SUM(CASE WHEN status IN ('cancelled', 'disputed', 'refunded') THEN 1 ELSE 0 END) AS cancelled_count
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
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
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
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date >= ?
        AND status IN (${toSqlList(BOOKING_UPCOMING_DB_STATUSES)})
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
      AwaitingPayment: Number(aggregate?.awaiting_payment_count ?? 0),
      Scheduled: Number(aggregate?.scheduled_count ?? 0),
      AwaitingCustomerConfirmation: Number(
        aggregate?.awaiting_customer_confirmation_count ?? 0
      ),
      Completed: Number(aggregate?.completed_count ?? 0),
      Cancelled: Number(aggregate?.cancelled_count ?? 0),
    },
    recentBookings: recentRows.map(normalizeBooking),
    upcomingBookings: upcomingRows.map(normalizeBooking),
  };
}

export async function listUserBookingHistory(userId: number) {
  await ensureBookingSchema();
  const { ensureDisputeSchema } = await import("@/lib/disputes");
  await ensureDisputeSchema();

  const pool = getDbPool();
  const query = `
    SELECT
      b.id,
      b.order_id,
      b.photographer_user_id,
      b.customer_user_id,
      b.category_id,
      b.package_id,
      b.customer_name,
      b.customer_phone,
      b.package_name,
      b.amount,
      DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
      b.booking_time,
      TIME_FORMAT(b.booking_end_time, '%H:%i') AS booking_end_time,
      b.location,
      b.event_address,
      b.event_latitude,
      b.event_longitude,
      b.distance_km,
      b.transport_fee,
      b.package_price,
      b.service_fee_rate,
      b.service_fee,
      b.total_price,
      b.note,
      b.status,
      b.service_completed_at,
      b.customer_confirmed_at,
      b.cancelled_at,
      b.created_at,
      COALESCE(NULLIF(p.brand_name, ''), u.name) AS photographer_name,
      pay.status AS payment_status,
      refund.status AS refund_request_status
    FROM bookings b
    LEFT JOIN partner_profiles p ON p.user_id = b.photographer_user_id
    LEFT JOIN users u ON u.id = b.photographer_user_id
    LEFT JOIN payments pay ON pay.booking_id = b.id
    LEFT JOIN booking_disputes refund
      ON refund.id = (
        SELECT bd.id
        FROM booking_disputes bd
        WHERE bd.booking_id = b.id
          AND bd.type = 'refund_request'
        ORDER BY bd.id DESC
        LIMIT 1
      )
    WHERE b.customer_user_id = ?
    ORDER BY b.booking_date DESC, b.booking_time DESC, b.id DESC
  `;

  let rows:
    | (BookingRow & {
        photographer_name: string | null;
        payment_status: string | null;
        refund_request_status: string | null;
      })[]
    | undefined;

  try {
    const [result] = await pool.execute<
      (BookingRow & {
        photographer_name: string | null;
        payment_status: string | null;
        refund_request_status: string | null;
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
        payment_status: string | null;
        refund_request_status: string | null;
      })[]
    >(query, [userId]);
    rows = retryResult;
  }

  return rows.map((row) => {
    const status = mapStatusFromDb(row.status);
    const serviceCompletedAt = normalizeTimestamp(row.service_completed_at);
    const customerConfirmedAt = normalizeTimestamp(row.customer_confirmed_at);
    const lifecycleStatus = getBookingLifecycleStatus({
      status,
      customerConfirmedAt,
    });
    const paymentStatus =
      typeof row.payment_status === "string" ? row.payment_status : null;
    const refundRequestStatus =
      typeof row.refund_request_status === "string"
        ? row.refund_request_status
        : null;

    return {
      id: row.id,
      orderId: row.order_id,
      photographerName: row.photographer_name || "Photographer",
      categoryId: row.category_id === null ? null : Number(row.category_id),
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      bookingEndTime: row.booking_end_time,
      amount: Number(row.amount),
      location: row.location,
      eventAddress: row.event_address,
      distanceKm: Number(row.distance_km ?? 0),
      transportFee: Number(row.transport_fee ?? 0),
      packagePrice:
        row.package_price === null ? null : Number(row.package_price),
      serviceFeeRate: Number(row.service_fee_rate ?? getServiceFeeRatePercent()),
      serviceFee: Number(row.service_fee ?? 0),
      totalPrice: row.total_price === null ? null : Number(row.total_price),
      status,
      lifecycleStatus,
      lifecycleStatusLabel: getBookingLifecycleLabel(lifecycleStatus),
      serviceCompletedAt,
      customerConfirmedAt,
      canCancelBooking: isBookingCancellableDbStatus(row.status),
      canRequestRefund:
        row.status === "cancelled" &&
        paymentStatus === "paid" &&
        !["open", "reviewing", "resolved_refund"].includes(
          refundRequestStatus ?? ""
        ),
      refundRequestStatus,
      canConfirmCompletion:
        isBookingAwaitingCustomerConfirmationDbStatus(row.status) &&
        row.service_completed_at !== null &&
        row.customer_confirmed_at === null,
    } satisfies UserBookingHistoryItem;
  });
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
        category_id,
        package_id,
        customer_name,
        customer_phone,
        package_name,
        amount,
        DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date,
        booking_time,
        TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time,
        location,
        event_address,
        event_latitude,
        event_longitude,
        distance_km,
        transport_fee,
        package_price,
        service_fee_rate,
        service_fee,
        total_price,
        note,
        status,
        service_completed_at,
        customer_confirmed_at,
        cancelled_at,
        created_at
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date = ?
      ORDER BY booking_time ASC, id ASC
    `,
    [userId, date]
  );

  return rows.map((row) => {
    const status = mapStatusFromDb(row.status);
    const lifecycleStatus = getBookingLifecycleStatus({
      status,
      customerConfirmedAt: normalizeTimestamp(row.customer_confirmed_at),
    });

    return {
      id: row.id,
      orderId: row.order_id,
      customerName: row.customer_name,
      packageName: row.package_name,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      bookingEndTime: row.booking_end_time,
      location: row.location,
      status,
      lifecycleStatus,
      lifecycleStatusLabel: getBookingLifecycleLabel(lifecycleStatus),
    } satisfies BookingCalendarItem;
  });
}
