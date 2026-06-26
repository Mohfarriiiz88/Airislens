import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { listAdminBookings } from "@/lib/bookings";
import { reconcilePendingPaymentsForPartner } from "@/lib/midtrans";

export const runtime = "nodejs";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await reconcilePendingPaymentsForPartner(authorized.userId, { limit: 5 });
  const bookings = await listAdminBookings(authorized.userId, 1);
  const latestBooking = bookings[0] ?? null;

  return NextResponse.json({ latestBooking });
}
