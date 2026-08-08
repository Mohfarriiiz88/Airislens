import "server-only";

import { getFonnteToken } from "@/lib/env";
import {
  normalizeIndonesianPhoneNumberOrThrow,
  sanitizePhoneNumber,
} from "@/lib/whatsapp-phone";

type BookingWhatsAppMessageInput = {
  customerName: string;
  customerPhone: string;
  packageName: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
};

type SendWhatsAppMessageInput = {
  target: string;
  message: string;
};

type FonnteSendApiResponse = {
  detail?: string;
  id?: string[];
  process?: string;
  requestid?: number;
  status?: boolean;
  target?: string[];
};

type FonnteValidateApiResponse = {
  not_registered?: string[];
  reason?: string;
  registered?: string[];
  status?: boolean;
};

type CachedWhatsAppValidationResult = {
  body: FonnteValidateApiResponse | null;
  message: string | null;
  normalizedPhone: string;
  rawBody: string;
  registered: boolean;
  serviceAvailable: boolean;
};

export type WhatsAppValidationResult = CachedWhatsAppValidationResult & {
  fromCache: boolean;
};

declare global {
  var __airislensWhatsAppValidationCache:
    | Map<string, { expiresAt: number; result: CachedWhatsAppValidationResult }>
    | undefined;
}

const WHATSAPP_VALIDATION_CACHE_TTL_MS = 10 * 60 * 1000;
const WHATSAPP_SERVICE_ERROR_MESSAGE =
  "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.";

function getWhatsAppValidationCache() {
  if (!global.__airislensWhatsAppValidationCache) {
    global.__airislensWhatsAppValidationCache = new Map();
  }

  return global.__airislensWhatsAppValidationCache;
}

function getCachedWhatsAppValidationResult(normalizedPhone: string) {
  const cache = getWhatsAppValidationCache();
  const cached = cache.get(normalizedPhone);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(normalizedPhone);
    return null;
  }

  return cached.result;
}

function setCachedWhatsAppValidationResult(
  normalizedPhone: string,
  result: CachedWhatsAppValidationResult
) {
  const cache = getWhatsAppValidationCache();

  cache.set(normalizedPhone, {
    expiresAt: Date.now() + WHATSAPP_VALIDATION_CACHE_TTL_MS,
    result,
  });
}

function tryNormalizeFonntePhone(value: string) {
  try {
    return normalizeIndonesianPhoneNumber(value);
  } catch {
    return sanitizePhoneNumber(value);
  }
}

function buildUserFacingNotRegisteredMessage(label: string) {
  return label === "Nomor WhatsApp"
    ? "Nomor tidak terdaftar di WhatsApp."
    : `${label} tidak terdaftar di WhatsApp.`;
}

function getFonnteValidateTarget(normalizedPhone: string) {
  return normalizedPhone.startsWith("62")
    ? `0${normalizedPhone.slice(2)}`
    : normalizedPhone;
}

export function getWhatsAppValidationServiceErrorMessage() {
  return WHATSAPP_SERVICE_ERROR_MESSAGE;
}

export function normalizeIndonesianPhoneNumber(value: string) {
  return normalizeIndonesianPhoneNumberOrThrow(value);
}

export async function validateWhatsAppNumberRegistration(value: string) {
  const token = getFonnteToken();
  const normalizedPhone = normalizeIndonesianPhoneNumber(value);
  const cached = getCachedWhatsAppValidationResult(normalizedPhone);

  if (cached) {
    return {
      ...cached,
      fromCache: true,
    } satisfies WhatsAppValidationResult;
  }

  let response: Response | null = null;
  let rawBody = "";
  let parsedBody: FonnteValidateApiResponse | null = null;

  try {
    response = await fetch("https://api.fonnte.com/validate", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: getFonnteValidateTarget(normalizedPhone),
        countryCode: "62",
      }).toString(),
      cache: "no-store",
    });
    rawBody = await response.text();

    try {
      parsedBody = JSON.parse(rawBody) as FonnteValidateApiResponse;
    } catch {
      parsedBody = null;
    }
  } catch {
    return {
      body: null,
      fromCache: false,
      message: WHATSAPP_SERVICE_ERROR_MESSAGE,
      normalizedPhone,
      rawBody: "",
      registered: false,
      serviceAvailable: false,
    } satisfies WhatsAppValidationResult;
  }

  const registeredNumbers = Array.isArray(parsedBody?.registered)
    ? parsedBody.registered.map(tryNormalizeFonntePhone)
    : [];
  const notRegisteredNumbers = Array.isArray(parsedBody?.not_registered)
    ? parsedBody.not_registered.map(tryNormalizeFonntePhone)
    : [];
  const registered =
    registeredNumbers.includes(normalizedPhone) ||
    (parsedBody?.status === true &&
      registeredNumbers.length > 0 &&
      !notRegisteredNumbers.includes(normalizedPhone));
  const serviceAvailable = response.ok && parsedBody?.status === true;
  const message = serviceAvailable
    ? registered
      ? null
      : "Nomor tidak terdaftar di WhatsApp."
    : WHATSAPP_SERVICE_ERROR_MESSAGE;

  const result: CachedWhatsAppValidationResult = {
    body: parsedBody,
    message,
    normalizedPhone,
    rawBody,
    registered,
    serviceAvailable,
  };

  if (serviceAvailable) {
    setCachedWhatsAppValidationResult(normalizedPhone, result);
  }

  return {
    ...result,
    fromCache: false,
  } satisfies WhatsAppValidationResult;
}

export async function requireRegisteredWhatsAppNumber(
  value: string,
  label = "Nomor WhatsApp"
) {
  const result = await validateWhatsAppNumberRegistration(value);

  if (!result.serviceAvailable) {
    throw new Error(WHATSAPP_SERVICE_ERROR_MESSAGE);
  }

  if (!result.registered) {
    throw new Error(buildUserFacingNotRegisteredMessage(label));
  }

  return result.normalizedPhone;
}

export function buildBookingWhatsAppMessage(
  input: BookingWhatsAppMessageInput
) {
  const location = input.location?.trim() || "-";
  const note = input.note?.trim() || "-";

  return [
    "Airislens",
    "Pesanan Baru telah diterima",
    "",
    `Nama: ${input.customerName.trim()}`,
    `WhatsApp: ${normalizeIndonesianPhoneNumber(input.customerPhone)}`,
    `Paket: ${input.packageName.trim()}`,
    `Tanggal: ${input.date}`,
    `Waktu: ${input.time}`,
    `Lokasi: ${location}`,
    `Catatan: ${note}`,
    "",
    "Silakan cek dashboard admin untuk detail booking.",
  ].join("\n");
}

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput) {
  const token = getFonnteToken();
  const target = normalizeIndonesianPhoneNumber(input.target);
  const formData = new URLSearchParams({
    target,
    message: input.message,
    countryCode: "0",
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
    cache: "no-store",
  });

  const rawBody = await response.text();
  let parsedBody: FonnteSendApiResponse | null = null;

  try {
    parsedBody = JSON.parse(rawBody) as FonnteSendApiResponse;
  } catch {
    parsedBody = null;
  }

  return {
    ok: response.ok && parsedBody?.status === true,
    status: response.status,
    body: parsedBody,
    rawBody,
    target,
  };
}
