import { type NextRequest, NextResponse } from "next/server";

import {
  listPackageTimeSlotAvailabilitySummaries,
} from "@/lib/schedules";

export const runtime = "nodejs";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const photographerParam =
    request.nextUrl.searchParams.get("photographerId")?.trim() ??
    request.nextUrl.searchParams.get("fg")?.trim() ??
    "";
  const packageParam = request.nextUrl.searchParams.get("packageId")?.trim() ?? "";
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const photographerUserId = Number(photographerParam);
  const packageId = Number(packageParam);

  if (!Number.isInteger(photographerUserId) || photographerUserId <= 0) {
    return NextResponse.json(
      { message: "Photographer ID tidak valid.", unavailableTimes: [], timeSlots: [] },
      { status: 400 }
    );
  }

  if (!date) {
    return NextResponse.json({ unavailableTimes: [], timeSlots: [] });
  }

  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { message: "Format tanggal tidak valid.", unavailableTimes: [], timeSlots: [] },
      { status: 400 }
    );
  }

  if (!Number.isInteger(packageId) || packageId <= 0) {
    return NextResponse.json(
      {
        message: "Paket wajib dipilih sebelum mengecek ketersediaan jadwal.",
        unavailableTimes: [],
        timeSlots: [],
      },
      { status: 400 }
    );
  }

  try {
    const timeSlots = await listPackageTimeSlotAvailabilitySummaries(
      photographerUserId,
      packageId,
      date
    );
    const unavailableTimes = timeSlots
      .filter((slot) => slot.status !== "available")
      .map((slot) => slot.time);

    return NextResponse.json({ unavailableTimes, timeSlots });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal memuat ketersediaan jadwal.",
        unavailableTimes: [],
        timeSlots: [],
      },
      { status: 400 }
    );
  }
}
