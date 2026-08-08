import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  GALLERY_DECLARATION_ERROR_MESSAGE,
  galleryDeclarationsAccepted,
  normalizeGalleryDeclarationPayload,
} from "@/lib/gallery-declarations";
import { assertOwnedUploadUrl, UploadError } from "@/lib/uploads";
import {
  createPartnerGalleryItem,
  listPartnerGalleryItemsForOwner,
} from "@/lib/partner-cms";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json(
      { message: "Anda harus login sebagai admin." },
      { status: 401 }
    );
  }

  const items = await listPartnerGalleryItemsForOwner(authorized.userId);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const authorized = await requireSessionWithRole(["admin"]);

    if (!authorized) {
      return NextResponse.json(
        { message: "Anda harus login sebagai admin." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      title?: string;
      category?: string;
      imageUrl?: string;
      ownershipDeclared?: unknown;
      subjectConsentDeclared?: unknown;
      publicationConsentDeclared?: unknown;
      responsibilityAccepted?: unknown;
    };

    const title = body.title?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const imageUrl = body.imageUrl?.trim() ?? "";
    const declarations = normalizeGalleryDeclarationPayload(body);

    if (!title || !category || !imageUrl) {
      return NextResponse.json(
        { message: "Judul, kategori, dan gambar wajib diisi." },
        { status: 400 }
      );
    }

    if (!galleryDeclarationsAccepted(declarations)) {
      return NextResponse.json(
        { message: GALLERY_DECLARATION_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    await assertOwnedUploadUrl(imageUrl, {
      kind: "gallery",
      userId: authorized.userId,
    });

    const item = await createPartnerGalleryItem(authorized.userId, {
      title,
      category,
      imageUrl,
      declarations,
    });

    return NextResponse.json({
      message: "Foto galeri berhasil ditambahkan.",
      item,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("ADMIN GALLERY CREATE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan foto galeri." },
      { status: 500 }
    );
  }
}
