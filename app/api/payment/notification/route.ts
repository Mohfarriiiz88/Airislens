import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { updateBookingStatusByOrderId } from "@/lib/bookings";

export const runtime = "nodejs";

type MidtransNotificationBody = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
};

function verifyMidtransSignature(payload: MidtransNotificationBody) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (
    !serverKey ||
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }

  // Midtrans signs notifications with order_id + status_code + gross_amount + serverKey.
  const expectedSignature = createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`
    )
    .digest("hex");

  return expectedSignature === payload.signature_key;
}

function mapMidtransStatusToBookingStatus(
  transactionStatus: string,
  fraudStatus?: string
) {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "Confirmed" : "Pending";
  }

  if (transactionStatus === "settlement") {
    return "Confirmed";
  }

  if (transactionStatus === "pending") {
    return "Pending";
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure" ||
    transactionStatus === "refund" ||
    transactionStatus === "partial_refund" ||
    transactionStatus === "chargeback" ||
    transactionStatus === "partial_chargeback"
  ) {
    return "Cancelled";
  }

  return null;
}

export async function POST(request: Request) {
  let body: MidtransNotificationBody;

  try {
    body = (await request.json()) as MidtransNotificationBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!verifyMidtransSignature(body)) {
    console.error("MIDTRANS WEBHOOK ERROR: invalid signature", {
      orderId: body.order_id,
      transactionId: body.transaction_id,
    });

    return NextResponse.json({ message: "Invalid signature." }, { status: 403 });
  }

  const orderId = body.order_id?.trim() || "";
  const transactionStatus = body.transaction_status?.trim().toLowerCase() || "";
  const fraudStatus = body.fraud_status?.trim().toLowerCase() || undefined;

  if (!orderId || !transactionStatus) {
    return NextResponse.json(
      { message: "Invalid notification payload." },
      { status: 400 }
    );
  }

  const nextBookingStatus = mapMidtransStatusToBookingStatus(
    transactionStatus,
    fraudStatus
  );

  if (!nextBookingStatus) {
    return NextResponse.json({
      message: "Notification received but no booking status mapping was applied.",
    });
  }

  const updated = await updateBookingStatusByOrderId(orderId, nextBookingStatus);

  if (!updated) {
    console.error("MIDTRANS WEBHOOK ERROR: booking not found", {
      orderId,
      transactionStatus,
      fraudStatus,
    });

    return NextResponse.json({ message: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({
    message: "Booking status updated.",
    orderId,
    bookingStatus: nextBookingStatus,
  });
}
