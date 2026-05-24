import midtransClient from "midtrans-client";
import { NextResponse } from "next/server";

import { createBooking } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";
import { sendBookingNotificationToAdmin } from "@/lib/notifications";

export const runtime = "nodejs";

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
      !Number.isInteger(photographerId) ||
      photographerId <= 0
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
        phone: body.phone,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await createBooking({
      orderId,
      photographerUserId: photographerId,
      customerUserId,
      packageId: body.packageId,
      customerName: body.name,
      customerPhone: body.phone,
      packageName: body.package,
      amount,
      bookingDate: body.date,
      bookingTime: body.time,
      location: body.location || "",
      note: body.note || "",
      status: "Pending",
    });

    try {
      await sendBookingNotificationToAdmin({
        customerName: body.name,
        packageName: body.package,
        date: body.date,
        time: body.time,
        location: body.location || "",
        photographerUserId: photographerId,
      });
    } catch (notificationError) {
      console.error("FCM NOTIFICATION ERROR:", notificationError);
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
