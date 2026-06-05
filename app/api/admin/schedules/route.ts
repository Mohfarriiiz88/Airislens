import { type NextRequest, NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  createPartnerSchedule,
  getAdminScheduleCalendar,
  ScheduleConflictError,
} from "@/lib/schedules";

export const runtime = "nodejs";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!date) {
    return NextResponse.json(
      { message: "Tanggal wajib diisi." },
      { status: 400 }
    );
  }

  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { message: "Format tanggal tidak valid." },
      { status: 400 }
    );
  }

  const calendar = await getAdminScheduleCalendar(authorized.userId, date);

  return NextResponse.json(calendar);
}

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    note?: string;
  };

  const title = body.title?.trim() ?? "";
  const date = body.date?.trim() ?? "";
  const time = body.time?.trim() ?? "";
  const location = body.location?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!title || !date || !time) {
    return NextResponse.json(
      { message: "Judul, tanggal, dan jam wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const schedule = await createPartnerSchedule(authorized.userId, {
      title,
      date,
      time,
      location,
      note,
    });

    return NextResponse.json({
      message: "Jadwal berhasil ditambahkan.",
      schedule,
    });
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message.includes("tidak valid")) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan jadwal.",
      },
      { status: 500 }
    );
  }
}
