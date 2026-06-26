import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { createWithdrawalRequest, WithdrawalStateError } from "@/lib/withdrawals";
import { WalletBalanceError } from "@/lib/wallets";

export const runtime = "nodejs";

function parseRequestedAmount(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new Error("Nominal withdrawal harus berupa angka bulat lebih dari 0.");
  }

  return numericValue;
}

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      requestedAmount?: number | string;
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
    };

    const requestedAmount = parseRequestedAmount(body.requestedAmount);
    const bankName = body.bankName?.trim() ?? "";
    const accountName = body.accountName?.trim() ?? "";
    const accountNumber = body.accountNumber?.trim() ?? "";

    if (!bankName || !accountName || !accountNumber) {
      return NextResponse.json(
        { message: "Bank, nama rekening, dan nomor rekening wajib diisi." },
        { status: 400 }
      );
    }

    const withdrawal = await createWithdrawalRequest({
      partnerUserId: authorized.userId,
      requestedAmount,
      bankName,
      accountName,
      accountNumber,
    });

    return NextResponse.json({
      message: "Permintaan pencairan berhasil dibuat dan saldo ditahan.",
      withdrawal,
    });
  } catch (error) {
    if (error instanceof WalletBalanceError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof WithdrawalStateError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("ADMIN WITHDRAWAL POST ERROR:", error);
    return NextResponse.json(
      { message: "Gagal membuat permintaan pencairan." },
      { status: 500 }
    );
  }
}
