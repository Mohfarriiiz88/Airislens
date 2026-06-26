import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { getPartnerFinanceOverview } from "@/lib/finance";
import { reconcilePendingPaymentsForPartner } from "@/lib/midtrans";

export const runtime = "nodejs";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    await reconcilePendingPaymentsForPartner(authorized.userId, { limit: 10 });
    const overview = await getPartnerFinanceOverview(authorized.userId);
    return NextResponse.json({ overview });
  } catch (error) {
    console.error("ADMIN FINANCE GET ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memuat data keuangan partner." },
      { status: 500 }
    );
  }
}
