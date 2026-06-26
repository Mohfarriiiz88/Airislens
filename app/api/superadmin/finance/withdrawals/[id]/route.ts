import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  approveWithdrawalRequest,
  markWithdrawalPaid,
  markWithdrawalProcessing,
  rejectWithdrawalRequest,
  WithdrawalStateError,
} from "@/lib/withdrawals";
import { WalletBalanceError } from "@/lib/wallets";

export const runtime = "nodejs";

type WithdrawalAction = "approve" | "reject" | "processing" | "paid";

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
    const withdrawalId = Number(rawId);

    if (!Number.isInteger(withdrawalId) || withdrawalId <= 0) {
      return NextResponse.json(
        { message: "ID withdrawal tidak valid." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      action?: WithdrawalAction;
      adminNote?: string;
      transferReference?: string;
    };

    const action = body.action;
    const adminNote = body.adminNote?.trim() || null;
    const transferReference = body.transferReference?.trim() || null;

    if (!action || !["approve", "reject", "processing", "paid"].includes(action)) {
      return NextResponse.json(
        { message: "Aksi withdrawal tidak valid." },
        { status: 400 }
      );
    }

    const reviewedByUserId = authorized.userId;
    let withdrawal = null;

    if (action === "approve") {
      withdrawal = await approveWithdrawalRequest(
        withdrawalId,
        reviewedByUserId,
        adminNote
      );
    } else if (action === "reject") {
      withdrawal = await rejectWithdrawalRequest(
        withdrawalId,
        reviewedByUserId,
        adminNote
      );
    } else if (action === "processing") {
      withdrawal = await markWithdrawalProcessing(
        withdrawalId,
        reviewedByUserId,
        adminNote
      );
    } else {
      withdrawal = await markWithdrawalPaid({
        withdrawalId,
        reviewedByUserId,
        transferReference,
        adminNote,
      });
    }

    return NextResponse.json({
      message: "Status withdrawal berhasil diperbarui.",
      withdrawal,
    });
  } catch (error) {
    if (error instanceof WithdrawalStateError || error instanceof WalletBalanceError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("SUPERADMIN WITHDRAWAL PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui status withdrawal." },
      { status: 500 }
    );
  }
}
