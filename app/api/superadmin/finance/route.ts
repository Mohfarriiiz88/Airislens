import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  getSuperadminFinanceOverview,
  type SuperadminFinanceOverview,
} from "@/lib/finance";
import { reconcileRecentPendingPayments } from "@/lib/midtrans";
import { type WithdrawalStatus } from "@/lib/withdrawals";

export const runtime = "nodejs";

const WITHDRAWAL_STATUSES = new Set<WithdrawalStatus>([
  "pending",
  "approved",
  "processing",
  "paid",
  "rejected",
  "failed",
  "cancelled",
]);

export async function GET(request: Request) {
  const authorized = await requireSessionWithRole(["superadmin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    await reconcileRecentPendingPayments({ limit: 20 });
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status");
    const status =
      rawStatus && WITHDRAWAL_STATUSES.has(rawStatus as WithdrawalStatus)
        ? (rawStatus as WithdrawalStatus)
        : undefined;

    const overview = await getSuperadminFinanceOverview(status);

    return NextResponse.json({
      overview: overview satisfies SuperadminFinanceOverview,
    });
  } catch (error) {
    console.error("SUPERADMIN FINANCE GET ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memuat data keuangan." },
      { status: 500 }
    );
  }
}
