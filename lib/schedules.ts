import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import {
  ensureBookingSchema,
  listAdminBookingsByDate,
  type BookingCalendarItem,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";

type PartnerScheduleRow = RowDataPacket & {
  id: number;
  user_id: number;
  title: string;
  schedule_date: string;
  schedule_time: string;
  location: string;
  note: string;
  created_at: Date | string;
  updated_at: Date | string;
};

declare global {
  var __airislensScheduleSchemaReady: Promise<void> | undefined;
}

export type PartnerSchedule = {
  id: number;
  userId: number;
  title: string;
  date: string;
  time: string;
  location: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type PartnerScheduleInput = {
  title: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
};

export type AdminScheduleCalendar = {
  schedules: PartnerSchedule[];
  bookings: BookingCalendarItem[];
  unavailableTimes: string[];
};

export class ScheduleConflictError extends Error {
  constructor(message = "Jadwal pada jam tersebut sudah terisi.") {
    super(message);
    this.name = "ScheduleConflictError";
  }
}

export class ScheduleNotFoundError extends Error {
  constructor(message = "Jadwal tidak ditemukan.") {
    super(message);
    this.name = "ScheduleNotFoundError";
  }
}

function normalizeDateTime(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeSchedule(row: PartnerScheduleRow): PartnerSchedule {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.schedule_date,
    time: row.schedule_time,
    location: row.location,
    note: row.note,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeInput(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

async function ensureScheduleSchemaInternal() {
  await ensureBookingSchema();

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_schedules (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(191) NOT NULL,
      schedule_date DATE NOT NULL,
      schedule_time VARCHAR(10) NOT NULL,
      location VARCHAR(191) NOT NULL DEFAULT '',
      note TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY partner_schedules_user_date_time_unique (user_id, schedule_date, schedule_time),
      KEY partner_schedules_user_id_idx (user_id),
      KEY partner_schedules_schedule_date_idx (schedule_date)
    )
  `);
}

export async function ensureScheduleSchema() {
  if (!global.__airislensScheduleSchemaReady) {
    global.__airislensScheduleSchemaReady = ensureScheduleSchemaInternal().catch(
      (error) => {
        global.__airislensScheduleSchemaReady = undefined;
        throw error;
      }
    );
  }

  return global.__airislensScheduleSchemaReady;
}

async function hasManualScheduleConflict(
  userId: number,
  date: string,
  time: string,
  ignoreScheduleId?: number
) {
  const pool = getDbPool();
  const ignoreClause =
    typeof ignoreScheduleId === "number" && ignoreScheduleId > 0
      ? "AND id <> ?"
      : "";
  const params =
    typeof ignoreScheduleId === "number" && ignoreScheduleId > 0
      ? [userId, date, time, ignoreScheduleId]
      : [userId, date, time];

  const [rows] = await pool.execute<
    (RowDataPacket & { total: number })[]
  >(
    `
      SELECT COUNT(*) AS total
      FROM partner_schedules
      WHERE user_id = ?
        AND schedule_date = ?
        AND schedule_time = ?
        ${ignoreClause}
      LIMIT 1
    `,
    params
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function hasBookingConflict(userId: number, date: string, time: string) {
  const pool = getDbPool();
  const [rows] = await pool.execute<
    (RowDataPacket & { total: number })[]
  >(
    `
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE photographer_user_id = ?
        AND booking_date = ?
        AND booking_time = ?
        AND status <> 'cancelled'
      LIMIT 1
    `,
    [userId, date, time]
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

export async function isTimeSlotUnavailable(
  userId: number,
  date: string,
  time: string,
  options?: {
    ignoreScheduleId?: number;
  }
) {
  await ensureScheduleSchema();

  const [hasScheduleConflict, hasBookedConflict] = await Promise.all([
    hasManualScheduleConflict(userId, date, time, options?.ignoreScheduleId),
    hasBookingConflict(userId, date, time),
  ]);

  return hasScheduleConflict || hasBookedConflict;
}

async function assertScheduleSlotAvailable(
  userId: number,
  input: PartnerScheduleInput,
  options?: {
    ignoreScheduleId?: number;
  }
) {
  if (await isTimeSlotUnavailable(userId, input.date, input.time, options)) {
    throw new ScheduleConflictError();
  }
}

export async function listPartnerSchedules(userId: number, date?: string) {
  await ensureScheduleSchema();

  if (date && !isValidDateInput(date)) {
    return [];
  }

  const pool = getDbPool();
  const hasDateFilter = Boolean(date && isValidDateInput(date));
  const [rows] = await pool.execute<PartnerScheduleRow[]>(
    `
      SELECT
        id,
        user_id,
        title,
        DATE_FORMAT(schedule_date, '%Y-%m-%d') AS schedule_date,
        schedule_time,
        location,
        note,
        created_at,
        updated_at
      FROM partner_schedules
      WHERE user_id = ?
        ${hasDateFilter ? "AND schedule_date = ?" : ""}
      ORDER BY schedule_date ASC, schedule_time ASC, id ASC
    `,
    hasDateFilter ? [userId, date] : [userId]
  );

  return rows.map(normalizeSchedule);
}

async function getPartnerScheduleById(userId: number, scheduleId: number) {
  await ensureScheduleSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerScheduleRow[]>(
    `
      SELECT
        id,
        user_id,
        title,
        DATE_FORMAT(schedule_date, '%Y-%m-%d') AS schedule_date,
        schedule_time,
        location,
        note,
        created_at,
        updated_at
      FROM partner_schedules
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [scheduleId, userId]
  );

  return rows[0] ? normalizeSchedule(rows[0]) : null;
}

export async function createPartnerSchedule(
  userId: number,
  input: PartnerScheduleInput
) {
  await ensureScheduleSchema();

  if (!isValidDateInput(input.date) || !isValidTimeInput(input.time)) {
    throw new Error("Tanggal atau jam jadwal tidak valid.");
  }

  await assertScheduleSlotAvailable(userId, input);

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO partner_schedules (
        user_id,
        title,
        schedule_date,
        schedule_time,
        location,
        note
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      input.title.trim(),
      input.date,
      input.time.trim(),
      input.location?.trim() ?? "",
      input.note?.trim() ?? "",
    ]
  );

  const schedules = await listPartnerSchedules(userId, input.date);
  const created = schedules.find((item) => item.id === Number(result.insertId));

  if (!created) {
    throw new Error("Gagal memuat jadwal yang baru dibuat.");
  }

  return created;
}

export async function updatePartnerSchedule(
  userId: number,
  scheduleId: number,
  input: PartnerScheduleInput
) {
  await ensureScheduleSchema();

  if (!isValidDateInput(input.date) || !isValidTimeInput(input.time)) {
    throw new Error("Tanggal atau jam jadwal tidak valid.");
  }

  const existing = await getPartnerScheduleById(userId, scheduleId);

  if (!existing) {
    throw new ScheduleNotFoundError();
  }

  await assertScheduleSlotAvailable(userId, input, {
    ignoreScheduleId: scheduleId,
  });

  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      UPDATE partner_schedules
      SET
        title = ?,
        schedule_date = ?,
        schedule_time = ?,
        location = ?,
        note = ?
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [
      input.title.trim(),
      input.date,
      input.time.trim(),
      input.location?.trim() ?? "",
      input.note?.trim() ?? "",
      scheduleId,
      userId,
    ]
  );

  const updated = await getPartnerScheduleById(userId, scheduleId);

  if (!updated) {
    throw new ScheduleNotFoundError();
  }

  return updated;
}

export async function deletePartnerSchedule(userId: number, scheduleId: number) {
  await ensureScheduleSchema();

  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `
      DELETE FROM partner_schedules
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [scheduleId, userId]
  );

  if (result.affectedRows === 0) {
    throw new ScheduleNotFoundError();
  }
}

export async function listUnavailableTimeSlots(userId: number, date: string) {
  await ensureScheduleSchema();

  if (!isValidDateInput(date)) {
    return [];
  }

  const pool = getDbPool();
  const [scheduleRows, bookingRows] = await Promise.all([
    pool.execute<(RowDataPacket & { schedule_time: string })[]>(
      `
        SELECT schedule_time
        FROM partner_schedules
        WHERE user_id = ?
          AND schedule_date = ?
      `,
      [userId, date]
    ),
    pool.execute<(RowDataPacket & { booking_time: string })[]>(
      `
        SELECT booking_time
        FROM bookings
        WHERE photographer_user_id = ?
          AND booking_date = ?
          AND status <> 'cancelled'
      `,
      [userId, date]
    ),
  ]);

  const occupied = new Set<string>();

  for (const row of scheduleRows[0]) {
    if (row.schedule_time) {
      occupied.add(row.schedule_time);
    }
  }

  for (const row of bookingRows[0]) {
    if (row.booking_time) {
      occupied.add(row.booking_time);
    }
  }

  return Array.from(occupied).sort((a, b) => a.localeCompare(b));
}

export async function getAdminScheduleCalendar(userId: number, date: string) {
  const [schedules, bookings, unavailableTimes] = await Promise.all([
    listPartnerSchedules(userId, date),
    listAdminBookingsByDate(userId, date),
    listUnavailableTimeSlots(userId, date),
  ]);

  return {
    schedules,
    bookings,
    unavailableTimes,
  } satisfies AdminScheduleCalendar;
}
