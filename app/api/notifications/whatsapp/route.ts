import { NextResponse } from "next/server";

import { getFonnteConfig, getJwtSecret } from "@/lib/env";
import {
  buildBookingWhatsAppMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

type WhatsAppNotificationRequestBody = {
  customerName?: string;
  customerPhone?: string;
  packageName?: string;
  date?: string;
  time?: string;
  location?: string;
  note?: string;
};

export async function POST(request: Request) {
  const internalToken = request.headers
    .get("x-airislens-internal-auth")
    ?.trim();

  // Block direct public use so the Fonnte route only accepts trusted server calls.
  if (internalToken !== getJwtSecret()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: WhatsAppNotificationRequestBody;

  try {
    body = (await request.json()) as WhatsAppNotificationRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body.customerName ||
    !body.customerPhone ||
    !body.packageName ||
    !body.date ||
    !body.time ||
    !DATE_PATTERN.test(body.date) ||
    !TIME_PATTERN.test(body.time)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const { adminPhone } = getFonnteConfig();
    const message = buildBookingWhatsAppMessage({
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      packageName: body.packageName,
      date: body.date,
      time: body.time,
      location: body.location,
      note: body.note,
    });

    const result = await sendWhatsAppMessage({
      target: adminPhone,
      message,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Fonnte send failed",
          detail: result.body?.detail || result.rawBody,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      detail: result.body?.detail || "success",
      target: result.target,
    });
  } catch (error) {
    console.error("FONNTE ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to send WhatsApp notification" },
      { status: 500 }
    );
  }
}
