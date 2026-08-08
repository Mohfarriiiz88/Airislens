import { validateIndonesianWhatsAppPhone } from "@/lib/partner-application-validation";

export function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeIndonesianPhoneNumberOrThrow(value: string) {
  const digits = sanitizePhoneNumber(value);
  const phoneError = validateIndonesianWhatsAppPhone(digits);

  if (phoneError) {
    throw new Error(phoneError);
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return `62${digits}`;
}

export function tryNormalizeIndonesianPhoneNumber(value: string) {
  try {
    return normalizeIndonesianPhoneNumberOrThrow(value);
  } catch {
    return null;
  }
}
