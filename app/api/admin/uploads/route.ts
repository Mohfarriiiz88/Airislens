import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  GALLERY_DECLARATION_ERROR_MESSAGE,
  galleryDeclarationsAccepted,
  normalizeGalleryDeclarationPayload,
} from "@/lib/gallery-declarations";
import { isUploadKind, saveUploadedFile, UploadError } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorized = await requireSessionWithRole(["admin"]);

    if (!authorized) {
      return NextResponse.json(
        { message: "Anda harus login sebagai admin." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");

    if (!isUploadKind(kind) || kind === "partner-cv") {
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

    if (kind === "gallery") {
      const declarations = normalizeGalleryDeclarationPayload({
        ownershipDeclared: formData.get("ownershipDeclared"),
        subjectConsentDeclared: formData.get("subjectConsentDeclared"),
        publicationConsentDeclared: formData.get("publicationConsentDeclared"),
        responsibilityAccepted: formData.get("responsibilityAccepted"),
      });

      if (!galleryDeclarationsAccepted(declarations)) {
        return NextResponse.json(
          { message: GALLERY_DECLARATION_ERROR_MESSAGE },
          { status: 400 }
        );
      }
    }

    const url = await saveUploadedFile({
      file,
      kind,
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

    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memproses upload gambar." },
      { status: 500 }
    );
  }
}
