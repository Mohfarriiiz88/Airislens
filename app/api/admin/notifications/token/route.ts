import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  deleteAdminNotificationToken,
  saveAdminNotificationToken,
} from "@/lib/notifications";

export const runtime = "nodejs";

type TokenRequestBody = {
  token?: string;
};

export async function POST(req: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as TokenRequestBody;
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { message: "FCM token wajib diisi." },
      { status: 400 }
    );
  }

  await saveAdminNotificationToken(
    authorized.userId,
    token,
    req.headers.get("user-agent") || ""
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as TokenRequestBody;
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { message: "FCM token wajib diisi." },
      { status: 400 }
    );
  }

  await deleteAdminNotificationToken(authorized.userId, token);

  return NextResponse.json({ ok: true });
}
