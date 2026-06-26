import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { createRefundRequest, BookingDisputeStateError } from "@/lib/disputes";

export const runtime = "nodejs";

export async function POST(
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

  try {
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
    };

    const reason = body.reason?.trim() || "Customer mengajukan refund.";

    const dispute = await createRefundRequest({
      bookingId,
      openedByUserId: authorized.userId,
      reason,
    });

    return NextResponse.json({
      message: "Permintaan refund berhasil dikirim ke superadmin untuk ditinjau.",
      dispute,
    });
  } catch (error) {
    if (error instanceof BookingDisputeStateError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("BOOKING REFUND REQUEST ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengajukan refund." },
      { status: 500 }
    );
  }
}
