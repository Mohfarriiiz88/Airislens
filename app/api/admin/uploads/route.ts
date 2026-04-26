import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { isUploadKind, saveUploadedFile } from "@/lib/uploads";

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");

  if (!isUploadKind(kind)) {
    return NextResponse.json(
      { message: "Jenis upload tidak valid." },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "File upload wajib diisi." },
      { status: 400 }
    );
  }

  const url = await saveUploadedFile({
    file,
    kind,
    userId: authorized.userId,
  });

  return NextResponse.json({ url });
}
