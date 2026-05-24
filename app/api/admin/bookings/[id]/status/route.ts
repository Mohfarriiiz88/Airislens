import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  type AdminBookingStatus,
  updateAdminBookingStatus,
} from "@/lib/bookings";

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

  const updated = await updateAdminBookingStatus(
    authorized.userId,
    bookingId,
    body.status
  );

  if (!updated) {
    return NextResponse.json(
      { message: "Booking tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Status booking berhasil diperbarui.",
  });
}
