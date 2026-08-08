import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { getBookingByOrderId } from "@/lib/bookings";
import { reconcilePaymentStatusByOrderId } from "@/lib/midtrans";
import { getPaymentByOrderId } from "@/lib/payments";

export const runtime = "nodejs";

type PaymentReconcileRequestBody = {
  orderId?: string;
};

function buildPendingMessage() {
  return "Pembayaran sedang disinkronkan. Silakan tunggu beberapa saat lagi.";
}

function buildFailedMessage(paymentStatus: string | null) {
  if (paymentStatus === "failed") {
    return "Pembayaran gagal diproses.";
  }

  if (paymentStatus === "expired") {
    return "Masa berlaku pembayaran sudah berakhir.";
  }

  if (paymentStatus === "cancelled") {
    return "Pembayaran dibatalkan.";
  }

  if (paymentStatus === "chargeback") {
    return "Pembayaran sedang dalam proses sengketa.";
  }

  return "Status pembayaran belum berhasil dikonfirmasi.";
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PaymentReconcileRequestBody;
    const orderId = body.orderId?.trim() ?? "";

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak valid." },
        { status: 400 }
      );
    }

    const requestedUserId = Number(session.sub);
    let booking = await getBookingByOrderId(orderId);

    if (!booking || booking.customerUserId !== requestedUserId) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    let reconcileError: unknown = null;

    try {
      await reconcilePaymentStatusByOrderId(orderId);
    } catch (error) {
      reconcileError = error;
      console.error("POST /api/payment/reconcile SYNC ERROR:", error);
    }

    booking = await getBookingByOrderId(orderId);

    if (!booking || booking.customerUserId !== requestedUserId) {
      return NextResponse.json(
        { success: false, message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    const payment = await getPaymentByOrderId(orderId);
    const paymentStatus = payment?.status ?? null;
    const success = paymentStatus === "paid";
    const pending =
      paymentStatus === null ||
      paymentStatus === "created" ||
      paymentStatus === "pending";

    if (success) {
      return NextResponse.json({
        success: true,
        orderId,
        booking: {
          id: booking.id,
          status: booking.status,
          lifecycleStatus: booking.lifecycleStatus,
          lifecycleStatusLabel: booking.lifecycleStatusLabel,
        },
        payment: {
          status: paymentStatus,
          paidAt: payment?.paidAt ?? null,
        },
      });
    }

    if (reconcileError) {
      return NextResponse.json(
        {
          success: false,
          pending: true,
          message: buildPendingMessage(),
          orderId,
          booking: {
            id: booking.id,
            status: booking.status,
            lifecycleStatus: booking.lifecycleStatus,
            lifecycleStatusLabel: booking.lifecycleStatusLabel,
          },
          payment: {
            status: paymentStatus,
            paidAt: payment?.paidAt ?? null,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        pending,
        message: pending ? buildPendingMessage() : buildFailedMessage(paymentStatus),
        orderId,
        booking: {
          id: booking.id,
          status: booking.status,
          lifecycleStatus: booking.lifecycleStatus,
          lifecycleStatusLabel: booking.lifecycleStatusLabel,
        },
        payment: {
          status: paymentStatus,
          paidAt: payment?.paidAt ?? null,
        },
      },
      { status: pending ? 202 : 200 }
    );
  } catch (error) {
    console.error("POST /api/payment/reconcile ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        pending: true,
        message: buildPendingMessage(),
      },
      { status: 500 }
    );
  }
}
