import { NextResponse } from "next/server";

import { readUploadedFile, UploadError } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const uploadFile = await readUploadedFile(path);

    if (!uploadFile) {
      return NextResponse.json(
        { message: "File upload tidak ditemukan." },
        { status: 404 }
      );
    }

    return new NextResponse(uploadFile.buffer, {
      status: 200,
      headers: {
        "Content-Type": uploadFile.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("UPLOAD FILE READ ERROR:", error);

    return NextResponse.json(
      { message: "Gagal membaca file upload." },
      { status: 500 }
    );
  }
}
