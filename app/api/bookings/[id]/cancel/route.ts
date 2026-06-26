import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { cancelUserBooking, getUserBookingById } from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import {
  reconcilePaymentStatusByOrderId,
  voidMidtransPendingPaymentByOrderId,
} from "@/lib/midtrans";
import {
  createPaymentEvent,
  getPaymentByBookingId,
  updatePayment,
} from "@/lib/payments";
import {
  markSettlementOnHoldDisputeByBookingId,
  markSettlementRefundedByBookingId,
} from "@/lib/settlements";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["user"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number(id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json(
      { message: "ID booking tidak valid." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { reason?: string | null }
    | null;
  const cancelReason = body?.reason?.trim() || "Dibatalkan oleh customer.";

  const booking = await getUserBookingById(authorized.userId, bookingId);

  if (!booking) {
    return NextResponse.json(
      { message: "Booking tidak ditemukan." },
      { status: 404 }
    );
  }

  if (booking.status === "Cancelled") {
    return NextResponse.json({
      message: "Booking ini sudah dibatalkan.",
      canRequestRefund: false,
    });
  }

  if (!["Pending", "Confirmed"].includes(booking.status)) {
    return NextResponse.json(
      {
        message:
          "Booking ini sudah berjalan atau selesai, sehingga tidak dapat dibatalkan oleh customer.",
      },
      { status: 400 }
    );
  }

  await reconcilePaymentStatusByOrderId(booking.orderId);
  const latestPayment = await getPaymentByBookingId(bookingId);

  if (
    latestPayment &&
    latestPayment.gateway === "midtrans" &&
    ["created", "pending"].includes(latestPayment.status)
  ) {
    try {
      await voidMidtransPendingPaymentByOrderId(booking.orderId);
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Gagal membatalkan transaksi pembayaran di Midtrans.",
        },
        { status: 400 }
      );
    }
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const refreshedBooking = await getUserBookingById(
      authorized.userId,
      bookingId,
      connection
    );

    if (!refreshedBooking) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Booking tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!["Pending", "Confirmed"].includes(refreshedBooking.status)) {
      await connection.rollback();
      return NextResponse.json(
        {
          message:
            "Booking ini tidak lagi memenuhi syarat untuk dibatalkan.",
        },
        { status: 400 }
      );
    }

    const payment = await getPaymentByBookingId(bookingId, connection);

    const updated = await cancelUserBooking(
      authorized.userId,
      bookingId,
      cancelReason,
      connection
    );

    if (!updated) {
      throw new Error("Pembatalan booking gagal disimpan.");
    }

    let message = "Booking berhasil dibatalkan.";
    let canRequestRefund = false;

    if (!payment) {
      await markSettlementRefundedByBookingId(bookingId, false, connection);
    } else if (payment.status === "paid") {
      await markSettlementOnHoldDisputeByBookingId(bookingId, connection);
      await createPaymentEvent(
        {
          paymentId: payment.id,
          eventType: "customer_booking_cancelled",
          gatewayStatus: payment.gatewayStatusRaw || "customer_booking_cancelled",
          payloadJson: {
            bookingId,
            orderId: refreshedBooking.orderId,
            reason: cancelReason,
          },
        },
        connection
      );

      message =
        "Booking berhasil dibatalkan. Karena pembayaran sudah masuk, Anda sekarang dapat mengajukan refund.";
      canRequestRefund = true;
    } else {
      await updatePayment(
        payment.id,
        {
          status:
            payment.status === "created" || payment.status === "pending"
              ? "cancelled"
              : payment.status,
          gatewayStatusRaw: "customer_booking_cancelled",
        },
        connection
      );
      await createPaymentEvent(
        {
          paymentId: payment.id,
          eventType: "customer_booking_cancelled",
          gatewayStatus: "customer_booking_cancelled",
          payloadJson: {
            bookingId,
            orderId: refreshedBooking.orderId,
            paymentStatusBeforeCancel: payment.status,
            reason: cancelReason,
          },
        },
        connection
      );
      await markSettlementRefundedByBookingId(bookingId, false, connection);
    }

    await connection.commit();

    return NextResponse.json({
      message,
      canRequestRefund,
    });
  } catch (error) {
    await connection.rollback();

    console.error("CUSTOMER BOOKING CANCEL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal membatalkan booking." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
