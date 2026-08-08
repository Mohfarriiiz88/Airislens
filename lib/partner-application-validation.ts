import {
  getPartnerApplicationDeclarations,
  PARTNER_TERMS_VERSION,
  PARTNER_APPLICATION_SERVICE_OPTIONS,
  type PartnerApplicationKind,
} from "@/lib/partner-application-shared";

export const PARTNER_APPLICATION_EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_PARTNER_APPLICATION_ABOUT_LENGTH = 3000;
export const PARTNER_APPLICATION_PHONE_HELPER_TEXT =
  "Gunakan nomor aktif 10-15 digit angka, boleh diawali 08, 8, atau 62.";
export const PARTNER_BANK_ACCOUNT_HELPER_TEXT =
  "Gunakan nomor rekening aktif 8-30 digit angka sesuai bank tujuan.";
export const PARTNER_CV_HELPER_TEXT =
  "Unggah CV dalam format PDF, DOC, atau DOCX dengan ukuran maksimal 5 MB.";

export function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function sanitizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeBankAccountDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function validateIndonesianWhatsAppPhone(
  value: string,
  label = "Nomor WhatsApp"
) {
  const digits = sanitizePhoneDigits(value);

  if (!digits) {
    return `${label} wajib diisi.`;
  }

  if (
    !digits.startsWith("0") &&
    !digits.startsWith("8") &&
    !digits.startsWith("62")
  ) {
    return `${label} harus diawali dengan 08, 8, atau 62.`;
  }

  const normalizedDigits = digits.startsWith("62")
    ? digits
    : digits.startsWith("0")
      ? `62${digits.slice(1)}`
      : `62${digits}`;

  if (normalizedDigits.length < 11 || normalizedDigits.length > 15) {
    return `${label} harus terdiri dari 10 sampai 15 digit angka.`;
  }

  return null;
}

export function normalizeBankAccountNumber(value: unknown) {
  return sanitizeBankAccountDigits(normalizeString(value));
}

export function validateBankAccountNumber(
  value: string,
  label = "Nomor rekening"
) {
  const digits = sanitizeBankAccountDigits(value);

  if (!digits) {
    return `${label} wajib diisi.`;
  }

  if (digits.length < 8 || digits.length > 30) {
    return `${label} harus terdiri dari 8 sampai 30 digit angka.`;
  }

  return null;
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isDriveUrl(value: string) {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  const { hostname } = new URL(value);
  return hostname === "drive.google.com" || hostname === "docs.google.com";
}

export function isInstagramUrl(value: string) {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  const { hostname } = new URL(value);
  return hostname === "instagram.com" || hostname === "www.instagram.com";
}

export function isGoogleMapsUrl(value: string) {
  if (!isValidHttpUrl(value)) {
    return false;
  }

  const url = new URL(value);
  const hostname = url.hostname;

  if (hostname === "maps.app.goo.gl" || hostname === "goo.gl") {
    return true;
  }

  if (
    hostname === "maps.google.com" ||
    hostname === "www.google.com" ||
    hostname.endsWith(".google.com")
  ) {
    return (
      url.pathname.includes("/maps") ||
      url.search.toLowerCase().includes("maps")
    );
  }

  return false;
}

export function normalizeServices(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowed = new Set(PARTNER_APPLICATION_SERVICE_OPTIONS);
  const normalized = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(
      (item) =>
        allowed.has(item as (typeof PARTNER_APPLICATION_SERVICE_OPTIONS)[number])
    );

  return [...new Set(normalized)];
}

export function parseEstablishedYear(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(numericValue) ||
    numericValue < 1900 ||
    numericValue > currentYear
  ) {
    return null;
  }

  return numericValue;
}

export function parsePartnerType(value: unknown): PartnerApplicationKind | null {
  return value === "studio" || value === "individual" ? value : null;
}

export function declarationsAreAccepted(
  partnerType: PartnerApplicationKind,
  acceptedDeclarations: unknown
) {
  if (!Array.isArray(acceptedDeclarations)) {
    return false;
  }

  const expected = getPartnerApplicationDeclarations(partnerType);
  const actual = new Set(
    acceptedDeclarations
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
  );

  return (
    actual.size === expected.length &&
    expected.every((item) => actual.has(item))
  );
}

export function partnerTermsAreAccepted(
  termsAccepted: unknown,
  termsVersion: unknown
) {
  return (
    termsAccepted === true &&
    normalizeString(termsVersion) === PARTNER_TERMS_VERSION
  );
}
