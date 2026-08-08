import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import {
  getWhatsAppValidationServiceErrorMessage,
  validateWhatsAppNumberRegistration,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

type ValidateWhatsAppRequestBody = {
  phone?: string;
};

declare global {
  var __airislensWhatsAppValidateRateLimit:
    | Map<string, { count: number; resetAt: number }>
    | undefined;
}

const RATE_LIMIT_MAX_REQUESTS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getRateLimitStore() {
  if (!global.__airislensWhatsAppValidateRateLimit) {
    global.__airislensWhatsAppValidateRateLimit = new Map();
  }

  return global.__airislensWhatsAppValidateRateLimit;
}

function consumeRateLimit(key: string) {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  entry.count += 1;
  store.set(key, entry);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { valid: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    consumeRateLimit(`wa-validate:${session.sub}`);

    const body = (await request.json()) as ValidateWhatsAppRequestBody;
    const phone = body.phone?.trim() ?? "";

    if (!phone) {
      return NextResponse.json(
        { valid: false, message: "Nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    const result = await validateWhatsAppNumberRegistration(phone);

    if (!result.serviceAvailable) {
      return NextResponse.json(
        {
          valid: false,
          phone: result.normalizedPhone,
          message: getWhatsAppValidationServiceErrorMessage(),
        },
        { status: 503 }
      );
    }

    if (!result.registered) {
      return NextResponse.json({
        valid: false,
        phone: result.normalizedPhone,
        message: "Nomor tidak terdaftar di WhatsApp.",
      });
    }

    return NextResponse.json({
      valid: true,
      phone: result.normalizedPhone,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json(
        {
          valid: false,
          message:
            "Terlalu banyak permintaan verifikasi nomor. Silakan coba lagi sebentar.",
        },
        { status: 429 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { valid: false, message: error.message },
        { status: 400 }
      );
    }

    console.error("POST /api/whatsapp/validate ERROR:", error);

    return NextResponse.json(
      {
        valid: false,
        message: getWhatsAppValidationServiceErrorMessage(),
      },
      { status: 500 }
    );
  }
}
