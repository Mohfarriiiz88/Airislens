import "server-only";

import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

import {
  addMinutesToTime,
  calculateBookingEndMinutes,
  calculateBookingEndTime,
  DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES,
  getBookingTimeRangeLabel,
  getBookingTimeRangeLabelFromMinutes,
  isRangeWithinWorkingHours,
  isTimeRangeOverlapping,
  parsePackageDurationToMinutes,
  parseTimeToMinutes,
  formatMinutesAsTime,
} from "@/lib/booking-time";
import {
  ensureBookingSchema,
  listAdminBookingsByDate,
  type BookingCalendarItem,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import { ensurePartnerCmsSchema } from "@/lib/partner-cms";
import { getPartnerBookingProfile } from "@/lib/partner-cms";
import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

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

type PartnerPackageDurationRow = RowDataPacket & {
  duration: string;
};

type ScheduleTimeRangeRow = RowDataPacket & {
  id: number;
  schedule_time: string;
};

type BookingTimeRangeRow = RowDataPacket & {
  id: number;
  booking_time: string;
  booking_end_time: string | null;
};

type TimeRange = {
  id: number;
  startTime: string;
  endTime: string;
};

type AvailabilityContext = {
  teamQuota: number;
  scheduleRanges: TimeRange[];
  bookingRanges: TimeRange[];
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
  endTime: string;
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

export type TimeSlotAvailabilitySummary = {
  time: string;
  endTime: string;
  rangeLabel: string;
  status:
    | "available"
    | "full"
    | "closed"
    | "conflict"
    | "outside_working_hours";
  activeBookings: number;
  teamQuota: number;
  remainingQuota: number;
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
    endTime: addMinutesToTime(
      row.schedule_time,
      DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
    ),
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

async function getPartnerTeamQuota(userId: number) {
  const profile = await getPartnerBookingProfile(userId);
  return Math.max(1, Number(profile?.teamQuota ?? 1));
}

async function getPartnerPackageDurationMinutes(userId: number, packageId: number) {
  await ensurePartnerCmsSchema();

  const pool = getDbPool();
  const [rows] = await pool.execute<PartnerPackageDurationRow[]>(
    `
      SELECT duration
      FROM partner_packages
      WHERE user_id = ?
        AND id = ?
      LIMIT 1
    `,
    [userId, packageId]
  );

  const duration = rows[0]?.duration?.trim() ?? "";

  if (!duration) {
    throw new Error("Durasi paket tidak ditemukan untuk fotografer ini.");
  }

  return parsePackageDurationToMinutes(duration);
}

function normalizeBookingRange(row: BookingTimeRangeRow): TimeRange {
  return {
    id: Number(row.id),
    startTime: row.booking_time,
    endTime:
      row.booking_end_time ||
      addMinutesToTime(
        row.booking_time,
        DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
      ),
  };
}

function normalizeScheduleRange(row: ScheduleTimeRangeRow): TimeRange {
  return {
    id: Number(row.id),
    startTime: row.schedule_time,
    endTime: addMinutesToTime(
      row.schedule_time,
      DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
    ),
  };
}

async function buildAvailabilityContext(userId: number, date: string) {
  await ensureScheduleSchema();

  const pool = getDbPool();
  const [scheduleRows, bookingRows, teamQuota] = await Promise.all([
    pool.execute<ScheduleTimeRangeRow[]>(
      `
        SELECT id, schedule_time
        FROM partner_schedules
        WHERE user_id = ?
          AND schedule_date = ?
      `,
      [userId, date]
    ),
    pool.execute<BookingTimeRangeRow[]>(
      `
        SELECT
          id,
          booking_time,
          TIME_FORMAT(booking_end_time, '%H:%i') AS booking_end_time
        FROM bookings
        WHERE photographer_user_id = ?
          AND booking_date = ?
          AND status <> 'cancelled'
      `,
      [userId, date]
    ),
    getPartnerTeamQuota(userId),
  ]);

  return {
    teamQuota,
    scheduleRanges: scheduleRows[0].map(normalizeScheduleRange),
    bookingRanges: bookingRows[0].map(normalizeBookingRange),
  } satisfies AvailabilityContext;
}

function evaluateTimeSlotAvailability(
  time: string,
  durationMinutes: number,
  context: AvailabilityContext,
  options?: {
    ignoreScheduleId?: number;
  }
) {
  const startMinutes = parseTimeToMinutes(time);
  const endMinutes = calculateBookingEndMinutes(time, durationMinutes);
  const endTime = formatMinutesAsTime(endMinutes, {
    wrapWithinDay: true,
  });
  const rawEndTime = formatMinutesAsTime(endMinutes, {
    allowOverflowHours: true,
  });
  const rangeLabel = getBookingTimeRangeLabelFromMinutes(
    startMinutes,
    endMinutes
  );

  if (!isRangeWithinWorkingHours(time, rawEndTime)) {
    return {
      time,
      endTime,
      rangeLabel,
      status: "outside_working_hours",
      activeBookings: 0,
      teamQuota: context.teamQuota,
      remainingQuota: 0,
    } satisfies TimeSlotAvailabilitySummary;
  }

  const hasScheduleConflict = context.scheduleRanges.some(
    (scheduleRange) =>
      scheduleRange.id !== options?.ignoreScheduleId &&
      isTimeRangeOverlapping(
        scheduleRange.startTime,
        scheduleRange.endTime,
        time,
        endTime
      )
  );

  if (hasScheduleConflict) {
    return {
      time,
      endTime,
      rangeLabel,
      status: "closed",
      activeBookings: 0,
      teamQuota: context.teamQuota,
      remainingQuota: 0,
    } satisfies TimeSlotAvailabilitySummary;
  }

  const activeBookings = context.bookingRanges.filter((bookingRange) =>
    isTimeRangeOverlapping(
      bookingRange.startTime,
      bookingRange.endTime,
      time,
      endTime
    )
  ).length;
  const remainingQuota = Math.max(0, context.teamQuota - activeBookings);

  if (activeBookings >= context.teamQuota) {
    return {
      time,
      endTime,
      rangeLabel,
      status: "full",
      activeBookings,
      teamQuota: context.teamQuota,
      remainingQuota: 0,
    } satisfies TimeSlotAvailabilitySummary;
  }

  return {
    time,
    endTime,
    rangeLabel,
    status: "available",
    activeBookings,
    teamQuota: context.teamQuota,
    remainingQuota,
  } satisfies TimeSlotAvailabilitySummary;
}

export async function isTimeSlotUnavailable(
  userId: number,
  date: string,
  time: string,
  options?: {
    ignoreScheduleId?: number;
    durationMinutes?: number;
  }
) {
  const durationMinutes =
    options?.durationMinutes ?? DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES;
  const context = await buildAvailabilityContext(userId, date);
  const summary = evaluateTimeSlotAvailability(
    time,
    durationMinutes,
    context,
    options
  );

  return summary.status !== "available";
}

async function assertScheduleSlotAvailable(
  userId: number,
  input: PartnerScheduleInput,
  options?: {
    ignoreScheduleId?: number;
  }
) {
  const context = await buildAvailabilityContext(userId, input.date);
  const summary = evaluateTimeSlotAvailability(
    input.time,
    DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES,
    context,
    options
  );

  if (summary.status === "outside_working_hours") {
    throw new ScheduleConflictError("Jadwal melewati jam kerja partner.");
  }

  if (summary.status !== "available") {
    throw new ScheduleConflictError(
      "Jadwal pada rentang waktu tersebut sudah terisi."
    );
  }
}

export async function listPartnerSchedules(userId: number, date?: string) {
  await ensureScheduleSchema();

  if (date && !isValidDateInput(date)) {
    return [];
  }

  const pool = getDbPool();
  const hasDateFilter = Boolean(date && isValidDateInput(date));
  const params: Array<string | number> = hasDateFilter
    ? [userId, date as string]
    : [userId];
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
    params
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
  const summaries = await listTimeSlotAvailabilitySummaries(
    userId,
    date,
    DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
  );

  return summaries
    .filter((item) => item.status !== "available")
    .map((item) => item.time);
}

export async function listTimeSlotAvailabilitySummaries(
  userId: number,
  date: string,
  durationMinutes = DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES
) {
  if (!isValidDateInput(date)) {
    return [];
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return [];
  }

  const context = await buildAvailabilityContext(userId, date);

  return BOOKING_TIME_SLOTS.map((time) =>
    evaluateTimeSlotAvailability(time, durationMinutes, context)
  );
}

export async function listPackageTimeSlotAvailabilitySummaries(
  userId: number,
  packageId: number,
  date: string
) {
  const durationMinutes = await getPartnerPackageDurationMinutes(userId, packageId);
  return listTimeSlotAvailabilitySummaries(userId, date, durationMinutes);
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
