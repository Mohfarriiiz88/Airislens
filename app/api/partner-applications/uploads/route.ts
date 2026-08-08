import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { saveUploadedFile, UploadError } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorized = await requireSessionWithRole(["user"]);

    if (!authorized) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "File CV wajib diisi." },
        { status: 400 }
      );
    }

    const url = await saveUploadedFile({
      file,
      kind: "partner-cv",
      userId: authorized.userId,
    });

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("PARTNER APPLICATION CV UPLOAD ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memproses upload CV." },
      { status: 500 }
    );
  }
}
