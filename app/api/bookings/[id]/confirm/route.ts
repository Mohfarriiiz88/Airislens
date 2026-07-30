import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  getUserBookingById,
  markCustomerBookingConfirmed,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import { reconcilePaymentStatusByOrderId } from "@/lib/midtrans";
import { releaseEscrowForBooking, SettlementStateError } from "@/lib/settlements";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
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

  const booking = await getUserBookingById(authorized.userId, bookingId);

  if (!booking) {
    return NextResponse.json(
      { message: "Booking tidak ditemukan." },
      { status: 404 }
    );
  }

  if (
    booking.status !== "AwaitingConfirmation" &&
    !(booking.status === "Completed" && !booking.customerConfirmedAt)
  ) {
    return NextResponse.json(
      { message: "Booking belum dapat dikonfirmasi selesai." },
      { status: 400 }
    );
  }

  if (!booking.serviceCompletedAt) {
    return NextResponse.json(
      {
        message:
          "Partner belum menandai pekerjaan sebagai selesai. Konfirmasi belum tersedia.",
      },
      { status: 400 }
    );
  }

  if (booking.customerConfirmedAt) {
    return NextResponse.json({
      message: "Booking ini sudah pernah Anda konfirmasi.",
    });
  }

  await reconcilePaymentStatusByOrderId(booking.orderId);

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

    if (refreshedBooking.customerConfirmedAt) {
      await connection.rollback();
      return NextResponse.json({
        message: "Booking ini sudah pernah Anda konfirmasi.",
      });
    }

    const updated = await markCustomerBookingConfirmed(
      authorized.userId,
      bookingId,
      connection
    );

    if (!updated) {
      throw new Error("Konfirmasi booking gagal disimpan.");
    }

    await releaseEscrowForBooking(bookingId, authorized.userId, connection);
    await connection.commit();

    return NextResponse.json({
      message:
        "Terima kasih. Booking selesai telah dikonfirmasi dan dana berhasil dirilis ke partner.",
    });
  } catch (error) {
    await connection.rollback();

    if (error instanceof SettlementStateError) {
      return NextResponse.json(
        {
          message:
            "Dana escrow belum siap dirilis. Pastikan pembayaran booking sudah tervalidasi.",
        },
        { status: 400 }
      );
    }

    console.error("CUSTOMER BOOKING CONFIRM ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengonfirmasi booking selesai." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
