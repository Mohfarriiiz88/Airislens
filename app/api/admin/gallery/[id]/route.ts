import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  deletePartnerGalleryItem,
  updatePartnerGalleryItem,
} from "@/lib/partner-cms";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const itemId = Number(id);
  const body = (await request.json()) as {
    title?: string;
    category?: string;
    imageUrl?: string;
  };

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json(
      { message: "ID galeri tidak valid." },
      { status: 400 }
    );
  }

  const title = body.title?.trim() ?? "";
  const category = body.category?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";

  if (!title || !category || !imageUrl) {
    return NextResponse.json(
      { message: "Judul, kategori, dan gambar wajib diisi." },
      { status: 400 }
    );
  }

  await updatePartnerGalleryItem(authorized.userId, itemId, {
    title,
    category,
    imageUrl,
  });

  return NextResponse.json({ message: "Foto galeri berhasil diperbarui." });
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
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json(
      { message: "ID galeri tidak valid." },
      { status: 400 }
    );
  }

  await deletePartnerGalleryItem(authorized.userId, itemId);

  return NextResponse.json({ message: "Foto galeri berhasil dihapus." });
}
