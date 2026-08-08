import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  GALLERY_DECLARATION_ERROR_MESSAGE,
  galleryDeclarationsAccepted,
  normalizeGalleryDeclarationPayload,
} from "@/lib/gallery-declarations";
import {
  deletePartnerGalleryItem,
  getPartnerGalleryItemById,
  updatePartnerGalleryItem,
} from "@/lib/partner-cms";
import {
  assertOwnedUploadUrl,
  deleteUploadedFileByUrl,
  UploadError,
} from "@/lib/uploads";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await requireSessionWithRole(["admin"]);

    if (!authorized) {
      return NextResponse.json(
        { message: "Anda harus login sebagai admin." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const itemId = Number(id);
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      imageUrl?: string;
      ownershipDeclared?: unknown;
      subjectConsentDeclared?: unknown;
      publicationConsentDeclared?: unknown;
      responsibilityAccepted?: unknown;
    };

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json(
        { message: "ID galeri tidak valid." },
        { status: 400 }
      );
    }

    const existingItem = await getPartnerGalleryItemById(itemId);

    if (!existingItem) {
      return NextResponse.json(
        { message: "Foto galeri tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existingItem.userId !== authorized.userId) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke foto galeri ini." },
        { status: 403 }
      );
    }

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

    const isReplacingImage = imageUrl !== existingItem.imageUrl;

    if (isReplacingImage && !galleryDeclarationsAccepted(declarations)) {
      return NextResponse.json(
        { message: GALLERY_DECLARATION_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    if (isReplacingImage) {
      await assertOwnedUploadUrl(imageUrl, {
        kind: "gallery",
        userId: authorized.userId,
      });
    }

    const updated = await updatePartnerGalleryItem(authorized.userId, itemId, {
      title,
      category,
      imageUrl,
      declarations: isReplacingImage ? declarations : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Foto galeri tidak ditemukan." },
        { status: 404 }
      );
    }

    if (isReplacingImage) {
      await deleteUploadedFileByUrl(existingItem.imageUrl);
    }

    return NextResponse.json({
      message: "Foto galeri berhasil diperbarui.",
      item: updated,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("ADMIN GALLERY UPDATE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memperbarui foto galeri." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await requireSessionWithRole(["admin"]);

    if (!authorized) {
      return NextResponse.json(
        { message: "Anda harus login sebagai admin." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const itemId = Number(id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json(
        { message: "ID galeri tidak valid." },
        { status: 400 }
      );
    }

    const existingItem = await getPartnerGalleryItemById(itemId);

    if (!existingItem) {
      return NextResponse.json(
        { message: "Foto galeri tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existingItem.userId !== authorized.userId) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke foto galeri ini." },
        { status: 403 }
      );
    }

    await deleteUploadedFileByUrl(existingItem.imageUrl);

    const deleted = await deletePartnerGalleryItem(authorized.userId, itemId);

    if (!deleted) {
      return NextResponse.json(
        { message: "Foto galeri tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Foto galeri berhasil dihapus." });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("ADMIN GALLERY DELETE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menghapus foto galeri." },
      { status: 500 }
    );
  }
}
