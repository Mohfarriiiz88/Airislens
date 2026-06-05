import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  deletePartnerSchedule,
  ScheduleConflictError,
  ScheduleNotFoundError,
  updatePartnerSchedule,
} from "@/lib/schedules";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const scheduleId = Number(id);

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return NextResponse.json(
      { message: "ID jadwal tidak valid." },
      { status: 400 }
    );
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
    const schedule = await updatePartnerSchedule(authorized.userId, scheduleId, {
      title,
      date,
      time,
      location,
      note,
    });

    return NextResponse.json({
      message: "Jadwal berhasil diperbarui.",
      schedule,
    });
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    if (error instanceof ScheduleNotFoundError) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
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
            : "Gagal memperbarui jadwal.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const scheduleId = Number(id);

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return NextResponse.json(
      { message: "ID jadwal tidak valid." },
      { status: 400 }
    );
  }

  try {
    await deletePartnerSchedule(authorized.userId, scheduleId);

    return NextResponse.json({
      message: "Jadwal berhasil dihapus.",
    });
  } catch (error) {
    if (error instanceof ScheduleNotFoundError) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Gagal menghapus jadwal." },
      { status: 500 }
    );
  }
}
