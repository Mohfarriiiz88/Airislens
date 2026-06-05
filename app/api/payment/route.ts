import midtransClient from "midtrans-client";
import { NextResponse } from "next/server";

import { createBooking } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";
import { getJwtSecret } from "@/lib/env";
import { isTimeSlotUnavailable } from "@/lib/schedules";
import { normalizeIndonesianPhoneNumber } from "@/lib/whatsapp";

export const runtime = "nodejs";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

type PaymentRequestBody = {
  name?: string;
  phone?: string;
  amount?: number;
  package?: string;
  packageId?: number;
  photographerId?: number;
  date?: string;
  time?: string;
  location?: string;
  note?: string;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = (await req.json()) as PaymentRequestBody;
    const amount = Number(body.amount);
    const photographerId = Number(body.photographerId);
    const customerUserId =
      session?.role === "user" ? Number(session.sub) : null;

    if (
      !body.name ||
      !body.phone ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !body.package ||
      !body.date ||
      !body.time ||
      !DATE_PATTERN.test(body.date) ||
      !TIME_PATTERN.test(body.time) ||
      !Number.isInteger(photographerId) ||
      photographerId <= 0
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    let normalizedCustomerPhone: string;

    try {
      normalizedCustomerPhone = normalizeIndonesianPhoneNumber(body.phone);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Format nomor WhatsApp tidak valid.",
        },
        { status: 400 }
      );
    }

    if (await isTimeSlotUnavailable(photographerId, body.date, body.time)) {
      return NextResponse.json(
        { error: "Jadwal pada jam tersebut sudah tidak tersedia." },
        { status: 409 }
      );
    }

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
    });

    const orderId = "AIRIS-" + Date.now();

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: body.name,
        phone: normalizedCustomerPhone,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await createBooking({
      orderId,
      photographerUserId: photographerId,
      customerUserId,
      packageId: body.packageId,
      customerName: body.name,
      customerPhone: normalizedCustomerPhone,
      packageName: body.package,
      amount,
      bookingDate: body.date,
      bookingTime: body.time,
      location: body.location || "",
      note: body.note || "",
      status: "Pending",
    });

    try {
      const notificationResponse = await fetch(
        new URL("/api/notifications/whatsapp", req.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-airislens-internal-auth": getJwtSecret(),
          },
          body: JSON.stringify({
            customerName: body.name,
            customerPhone: normalizedCustomerPhone,
            packageName: body.package,
            date: body.date,
            time: body.time,
            location: body.location || "",
            note: body.note || "",
          }),
          cache: "no-store",
        }
      );

      if (!notificationResponse.ok) {
        const notificationBody = (await notificationResponse
          .json()
          .catch(() => null)) as { error?: string; detail?: string } | null;

        throw new Error(
          notificationBody?.detail ||
            notificationBody?.error ||
            `HTTP ${notificationResponse.status}`
        );
      }
    } catch (notificationError) {
      // Booking stays successful even if WhatsApp delivery fails.
      console.error("FONNTE WHATSAPP ERROR:", notificationError);
    }

    return NextResponse.json({
      token: transaction.token,
    });
  } catch (error) {
    console.error("MIDTRANS ERROR:", error);

    return NextResponse.json(
      { error: "Payment failed" },
      { status: 500 }
    );
  }
}
