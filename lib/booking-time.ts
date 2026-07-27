import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

export const DEFAULT_MANUAL_SCHEDULE_DURATION_MINUTES = 60;
export const DEFAULT_SLOT_INTERVAL_MINUTES = 60;
export const MINUTES_PER_DAY = 24 * 60;

type TimeParsingOptions = {
  allowOverflowHours?: boolean;
};

type TimeFormattingOptions = {
  allowOverflowHours?: boolean;
  wrapWithinDay?: boolean;
  includeDayOffsetSuffix?: boolean;
};

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

export function parseTimeToMinutes(value: string, options?: TimeParsingOptions) {
  const normalized = value.trim();

  const pattern = options?.allowOverflowHours ? /^\d{2,3}:\d{2}$/ : /^\d{2}:\d{2}$/;

  if (!pattern.test(normalized)) {
    throw new Error("Format waktu tidak valid.");
  }

  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    (!options?.allowOverflowHours && hours > 23) ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Format waktu tidak valid.");
  }

  return hours * 60 + minutes;
}

function getDayOffset(totalMinutes: number) {
  return Math.floor(Math.round(totalMinutes) / MINUTES_PER_DAY);
}

function getDayOffsetSuffix(totalMinutes: number) {
  const dayOffset = getDayOffset(totalMinutes);

  if (dayOffset <= 0) {
    return "";
  }

  return ` (+${dayOffset} hari)`;
}

export function formatMinutesAsTime(
  totalMinutes: number,
  options?: TimeFormattingOptions
) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    throw new Error("Nilai menit tidak valid.");
  }

  const normalizedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  if (
    hours < 0 ||
    minutes < 0 ||
    minutes > 59 ||
    (hours > 23 &&
      !options?.allowOverflowHours &&
      !options?.wrapWithinDay)
  ) {
    throw new Error("Waktu berada di luar rentang satu hari.");
  }

  const displayHours = options?.wrapWithinDay ? hours % 24 : hours;
  const suffix = options?.includeDayOffsetSuffix
    ? getDayOffsetSuffix(normalizedMinutes)
    : "";

  return `${padTimePart(displayHours)}:${padTimePart(minutes)}${suffix}`;
}

export function addMinutesToTime(
  time: string,
  minutesToAdd: number,
  options?: TimeParsingOptions & TimeFormattingOptions
) {
  if (!Number.isFinite(minutesToAdd) || minutesToAdd < 0) {
    throw new Error("Durasi waktu tidak valid.");
  }

  const resultMinutes =
    parseTimeToMinutes(time, {
      allowOverflowHours: options?.allowOverflowHours,
    }) + Math.round(minutesToAdd);
  return formatMinutesAsTime(resultMinutes, options);
}

export function parsePackageDurationToMinutes(duration: string) {
  const normalized = duration.trim().toLowerCase().replace(/,/g, ".");

  if (!normalized) {
    throw new Error("Durasi paket wajib diisi.");
  }

  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1]);
    const minutes = Number(hhmmMatch[2]);

    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return hours * 60 + minutes;
    }
  }

  let totalMinutes = 0;
  const tokenPattern =
    /(\d+(?:\.\d+)?)\s*(jam kerja|jam|j\b|hours?|hrs?|h\b|menit|minutes?|mins?|m\b)?/g;
  const matches = Array.from(normalized.matchAll(tokenPattern));

  for (const match of matches) {
    const rawValue = match[1];
    const unit = match[2]?.trim() ?? "";

    if (!rawValue) {
      continue;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    if (
      unit === "menit" ||
      unit === "minute" ||
      unit === "minutes" ||
      unit === "min" ||
      unit === "mins" ||
      unit === "m"
    ) {
      totalMinutes += value;
      continue;
    }

    totalMinutes += value * 60;
  }

  if (totalMinutes > 0) {
    return Math.round(totalMinutes);
  }

  const fallbackNumberMatch = normalized.match(/(\d+(?:\.\d+)?)/);

  if (fallbackNumberMatch) {
    const fallbackValue = Number(fallbackNumberMatch[1]);

    if (Number.isFinite(fallbackValue) && fallbackValue > 0) {
      return Math.round(fallbackValue * 60);
    }
  }

  throw new Error("Durasi paket tidak dapat dibaca.");
}

export function calculateBookingEndTime(
  startTime: string,
  durationMinutes: number,
  options?: TimeParsingOptions & TimeFormattingOptions
) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Durasi booking tidak valid.");
  }

  return addMinutesToTime(startTime, durationMinutes, options);
}

export function calculateBookingEndMinutes(
  startTime: string,
  durationMinutes: number
) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Durasi booking tidak valid.");
  }

  return parseTimeToMinutes(startTime) + Math.round(durationMinutes);
}

export function isTimeRangeOverlapping(
  existingStartTime: string,
  existingEndTime: string,
  requestedStartTime: string,
  requestedEndTime: string
) {
  const existingStart = parseTimeToMinutes(existingStartTime);
  const existingEnd = parseTimeToMinutes(existingEndTime, {
    allowOverflowHours: true,
  });
  const requestedStart = parseTimeToMinutes(requestedStartTime);
  const requestedEnd = parseTimeToMinutes(requestedEndTime, {
    allowOverflowHours: true,
  });

  return existingStart < requestedEnd && existingEnd > requestedStart;
}

export function getBookingTimeRangeLabel(
  startTime: string,
  endTime: string
) {
  return `${startTime} - ${endTime}`;
}

export function formatBookingTimeWindow(
  startTime: string,
  endTime?: string | null
) {
  const normalizedStart = startTime.trim();
  const normalizedEnd = endTime?.trim() ?? "";

  if (!normalizedStart) {
    return "-";
  }

  const startLabel = formatMinutesAsTime(
    parseTimeToMinutes(normalizedStart, { allowOverflowHours: true }),
    {
      wrapWithinDay: true,
    }
  );

  if (!normalizedEnd || normalizedEnd === normalizedStart) {
    return startLabel;
  }

  const endLabel = formatMinutesAsTime(
    parseTimeToMinutes(normalizedEnd, { allowOverflowHours: true }),
    {
      wrapWithinDay: true,
      includeDayOffsetSuffix: true,
    }
  );

  return getBookingTimeRangeLabel(startLabel, endLabel);
}

export function getBookingTimeRangeLabelFromMinutes(
  startMinutes: number,
  endMinutes: number
) {
  const startLabel = formatMinutesAsTime(startMinutes, {
    wrapWithinDay: true,
  });
  const endLabel = formatMinutesAsTime(endMinutes, {
    wrapWithinDay: true,
    includeDayOffsetSuffix: true,
  });

  return getBookingTimeRangeLabel(startLabel, endLabel);
}

export function getBookingWorkingHoursBounds() {
  const startTime = BOOKING_TIME_SLOTS[0];
  const lastStartTime = BOOKING_TIME_SLOTS[BOOKING_TIME_SLOTS.length - 1];
  const endTime = addMinutesToTime(lastStartTime, DEFAULT_SLOT_INTERVAL_MINUTES);

  return {
    startTime,
    endTime,
    startMinutes: parseTimeToMinutes(startTime),
    endMinutes: parseTimeToMinutes(endTime),
  };
}

export function isRangeWithinWorkingHours(
  startTime: string,
  endTime: string
) {
  const bounds = getBookingWorkingHoursBounds();
  const startMinutes = parseTimeToMinutes(startTime, {
    allowOverflowHours: true,
  });
  const endMinutes = parseTimeToMinutes(endTime, {
    allowOverflowHours: true,
  });

  return (
    startMinutes >= bounds.startMinutes && endMinutes <= bounds.endMinutes
  );
}
