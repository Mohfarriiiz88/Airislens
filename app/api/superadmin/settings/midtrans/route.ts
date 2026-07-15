import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import {
  getMidtransConfigSummary,
  writeMidtransConfig,
} from "@/lib/midtrans-config";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const summary = await getMidtransConfigSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/superadmin/settings/midtrans ERROR:", error);
    return NextResponse.json(
      { message: "Gagal membaca konfigurasi Midtrans." },
      { status: 500 }
    );
  }
}

type UpdateBody = {
  serverKey?: string | null;
  clientKey?: string | null;
  isProduction?: boolean;
};

export async function PUT(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "superadmin") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body.isProduction !== "boolean") {
    return NextResponse.json(
      { message: "Field isProduction wajib diisi (boolean)." },
      { status: 400 }
    );
  }

  try {
    const userId = Number(session.sub);
    await writeMidtransConfig(
      {
        serverKey: body.serverKey ?? null,
        clientKey: body.clientKey ?? null,
        isProduction: body.isProduction,
      },
      Number.isFinite(userId) ? userId : null
    );

    const summary = await getMidtransConfigSummary();
    return NextResponse.json({
      message: "Konfigurasi Midtrans berhasil diperbarui.",
      ...summary,
    });
  } catch (error) {
    console.error("PUT /api/superadmin/settings/midtrans ERROR:", error);
    return NextResponse.json(
      { message: "Gagal menyimpan konfigurasi Midtrans." },
      { status: 500 }
    );
  }
}
