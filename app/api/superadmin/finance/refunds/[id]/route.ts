import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  BookingDisputeStateError,
  MidtransRefundError,
  resolveRefundRequest,
} from "@/lib/disputes";
import { WalletBalanceError } from "@/lib/wallets";

export const runtime = "nodejs";

type RefundAction = "approve" | "reject";
type RefundMode = "auto" | "manual";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["superadmin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id: rawId } = await context.params;
    const disputeId = Number(rawId);

    if (!Number.isInteger(disputeId) || disputeId <= 0) {
      return NextResponse.json(
        { message: "ID refund request tidak valid." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      action?: RefundAction;
      mode?: RefundMode;
      resolution?: string;
    };

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return NextResponse.json(
        { message: "Aksi refund tidak valid." },
        { status: 400 }
      );
    }

    const dispute = await resolveRefundRequest({
      disputeId,
      action: body.action,
      mode: body.mode,
      resolvedByUserId: authorized.userId,
      resolution: body.resolution?.trim() || null,
    });

    return NextResponse.json({
      message:
        body.action === "approve" && body.mode === "manual"
          ? "Refund manual berhasil ditandai selesai."
          : body.action === "approve"
            ? "Refund berhasil diajukan ke Midtrans dan menunggu konfirmasi."
          : "Permintaan refund ditolak.",
      dispute,
    });
  } catch (error) {
    if (
      error instanceof BookingDisputeStateError ||
      error instanceof MidtransRefundError ||
      error instanceof WalletBalanceError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("SUPERADMIN REFUND PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memproses refund request." },
      { status: 500 }
    );
  }
}
