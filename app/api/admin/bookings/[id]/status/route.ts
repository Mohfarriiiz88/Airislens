import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  getAdminBookingById,
  type AdminBookingStatus,
  updateAdminBookingStatus,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import { getPaymentByBookingId } from "@/lib/payments";
import { reconcilePaymentStatusByOrderId } from "@/lib/midtrans";
import {
  markSettlementReadyToReleaseByBookingId,
  markSettlementRefundedByBookingId,
} from "@/lib/settlements";

export const runtime = "nodejs";

const ALLOWED_STATUSES: AdminBookingStatus[] = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

function isAllowedStatus(value: unknown): value is AdminBookingStatus {
  return (
    typeof value === "string" &&
    ALLOWED_STATUSES.includes(value as AdminBookingStatus)
  );
}

function isValidStatusTransition(
  currentStatus: AdminBookingStatus,
  nextStatus: AdminBookingStatus
) {
  const allowedTransitions: Record<AdminBookingStatus, AdminBookingStatus[]> = {
    Pending: ["Pending", "Confirmed", "Cancelled"],
    Confirmed: ["Confirmed", "Completed", "Cancelled"],
    Completed: ["Completed"],
    Cancelled: ["Cancelled"],
  };

  return allowedTransitions[currentStatus].includes(nextStatus);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number(id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json(
      { message: "ID booking tidak valid." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as {
    status?: unknown;
  };

  if (!isAllowedStatus(body.status)) {
    return NextResponse.json(
      { message: "Status booking tidak valid." },
      { status: 400 }
    );
  }

  const booking = await getAdminBookingById(authorized.userId, bookingId);

  if (!booking) {
    return NextResponse.json(
      { message: "Booking tidak ditemukan." },
      { status: 404 }
    );
  }

  if (!isValidStatusTransition(booking.status, body.status)) {
    return NextResponse.json(
      {
        message: `Perubahan status dari ${booking.status} ke ${body.status} tidak diizinkan.`,
      },
      { status: 400 }
    );
  }

  if (booking.status === "Pending" && body.status === "Confirmed") {
    await reconcilePaymentStatusByOrderId(booking.orderId);

    const payment = await getPaymentByBookingId(bookingId);

    if (payment?.status !== "paid") {
      return NextResponse.json(
        {
          message:
            "Booking belum bisa dikonfirmasi karena pembayaran belum tervalidasi.",
        },
        { status: 400 }
      );
    }
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const updated = await updateAdminBookingStatus(
      authorized.userId,
      bookingId,
      body.status,
      connection
    );

    if (!updated) {
      throw new Error("Booking gagal diperbarui.");
    }

    let message = "Status booking berhasil diperbarui.";

    if (body.status === "Completed") {
      await markSettlementReadyToReleaseByBookingId(bookingId, connection);
      message =
        "Booking diselesaikan. Dana escrow menunggu konfirmasi selesai dari customer.";
    } else if (body.status === "Cancelled") {
      await markSettlementRefundedByBookingId(bookingId, false, connection);
      message =
        "Booking dibatalkan. Settlement yang belum dirilis ditandai sebagai refunded.";
    }

    await connection.commit();

    return NextResponse.json({ message });
  } catch (error) {
    await connection.rollback();

    console.error("ADMIN BOOKING STATUS PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui status booking." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
