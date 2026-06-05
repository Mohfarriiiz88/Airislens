import "server-only";

import { getFonnteConfig } from "@/lib/env";

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

type FonnteApiResponse = {
  detail?: string;
  id?: string[];
  process?: string;
  status?: boolean;
  target?: string[];
};

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeIndonesianPhoneNumber(value: string) {
  const digits = sanitizePhoneNumber(value);

  if (!digits) {
    throw new Error("Nomor WhatsApp wajib diisi.");
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  throw new Error("Format nomor WhatsApp tidak valid.");
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
  const { token } = getFonnteConfig();
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
  let parsedBody: FonnteApiResponse | null = null;

  try {
    parsedBody = JSON.parse(rawBody) as FonnteApiResponse;
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
