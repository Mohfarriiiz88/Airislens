import midtransClient from "midtrans-client";
import { NextResponse } from "next/server";

import { BookingPricingError, getBookingQuote } from "@/lib/booking-pricing";
import { BookingSlotUnavailableError, createBooking } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";
import { getDbPool } from "@/lib/db";
import { getJwtSecret, getMidtransConfig } from "@/lib/env";
import { createPayment } from "@/lib/payments";
import { isTimeSlotUnavailable } from "@/lib/schedules";
import { createBookingSettlement } from "@/lib/settlements";
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
  eventAddress?: string;
  eventLatitude?: number;
  eventLongitude?: number;
  note?: string;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = (await req.json()) as PaymentRequestBody;
    const photographerId = Number(body.photographerId);
    const packageId = Number(body.packageId);
    const customerUserId =
      session?.role === "user" ? Number(session.sub) : null;

    if (
      !body.name ||
      !body.phone ||
      !body.date ||
      !body.time ||
      !DATE_PATTERN.test(body.date) ||
      !TIME_PATTERN.test(body.time) ||
      !Number.isInteger(photographerId) ||
      photographerId <= 0 ||
      !Number.isInteger(packageId) ||
      packageId <= 0
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

    const quote = await getBookingQuote({
      photographerUserId: photographerId,
      packageId,
      eventAddress: body.eventAddress ?? body.location ?? "",
      eventLatitude: Number(body.eventLatitude),
      eventLongitude: Number(body.eventLongitude),
    });
    const midtrans = getMidtransConfig();

    const snap = new midtransClient.Snap({
      isProduction: midtrans.isProduction,
      serverKey: midtrans.serverKey,
    });

    const orderId = "AIRIS-" + Date.now();

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: quote.totalPrice,
      },
      customer_details: {
        first_name: body.name,
        phone: normalizedCustomerPhone,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const bookingId = await createBooking(
        {
          orderId,
          photographerUserId: photographerId,
          customerUserId,
          packageId: quote.packageId,
          customerName: body.name,
          customerPhone: normalizedCustomerPhone,
          packageName: quote.packageName,
          amount: quote.totalPrice,
          bookingDate: body.date,
          bookingTime: body.time,
          location: quote.eventAddress,
          eventAddress: quote.eventAddress,
          eventLatitude: quote.eventLatitude,
          eventLongitude: quote.eventLongitude,
          distanceKm: quote.distanceKm,
          transportFee: quote.transportFee,
          packagePrice: quote.packagePrice,
          totalPrice: quote.totalPrice,
          note: body.note || "",
          status: "Pending",
        },
        connection
      );

      await createPayment(
        {
          bookingId,
          orderId,
          grossAmount: quote.totalPrice,
          gateway: "midtrans",
          currency: "IDR",
          status: "pending",
          payloadJson: {
            snapRequest: parameter,
            snapResponse: {
              token: transaction.token,
              redirectUrl: transaction.redirect_url,
            },
          },
        },
        connection
      );

      await createBookingSettlement(
        {
          bookingId,
          photographerUserId: photographerId,
          grossAmount: quote.totalPrice,
          packagePrice: quote.packagePrice ?? quote.totalPrice,
          transportFee: quote.transportFee,
          notes: "Settlement dibuat saat checkout booking.",
        },
        connection
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

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
            packageName: quote.packageName,
            date: body.date,
            time: body.time,
            location: quote.eventAddress,
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
      breakdown: quote,
    });
  } catch (error) {
    if (error instanceof BookingSlotUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error instanceof BookingPricingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("MIDTRANS ERROR:", error);

    return NextResponse.json(
      { error: "Payment failed" },
      { status: 500 }
    );
  }
}
