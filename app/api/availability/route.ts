import { type NextRequest, NextResponse } from "next/server";

import { listUnavailableTimeSlots } from "@/lib/schedules";

export const runtime = "nodejs";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const fg = request.nextUrl.searchParams.get("fg")?.trim() ?? "";
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const photographerUserId = Number(fg);

  if (!Number.isInteger(photographerUserId) || photographerUserId <= 0) {
    return NextResponse.json(
      { message: "Photographer ID tidak valid.", unavailableTimes: [] },
      { status: 400 }
    );
  }

  if (!date) {
    return NextResponse.json({ unavailableTimes: [] });
  }

  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { message: "Format tanggal tidak valid.", unavailableTimes: [] },
      { status: 400 }
    );
  }

  const unavailableTimes = await listUnavailableTimeSlots(
    photographerUserId,
    date
  );

  return NextResponse.json({ unavailableTimes });
}
