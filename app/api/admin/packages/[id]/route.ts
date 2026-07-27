import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  PartnerCategoryValidationError,
  deletePartnerPackage,
  updatePartnerPackage,
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
  const packageId = Number(id);
  const body = (await request.json()) as {
    categoryId?: number;
    name?: string;
    duration?: string;
    price?: number;
    description?: string;
  };

  if (!Number.isInteger(packageId) || packageId <= 0) {
    return NextResponse.json(
      { message: "ID paket tidak valid." },
      { status: 400 }
    );
  }

  const categoryId = Number(body.categoryId);
  const name = body.name?.trim() ?? "";
  const duration = body.duration?.trim() ?? "";
  const price = Number(body.price ?? 0);
  const description = body.description?.trim() ?? "";

  if (
    !Number.isInteger(categoryId) ||
    categoryId <= 0 ||
    !name ||
    !duration ||
    price <= 0
  ) {
    return NextResponse.json(
      { message: "Kategori, nama, durasi, dan harga paket wajib diisi." },
      { status: 400 }
    );
  }

  try {
    await updatePartnerPackage(authorized.userId, packageId, {
      categoryId,
      name,
      duration,
      price,
      description,
    });
  } catch (error) {
    if (error instanceof PartnerCategoryValidationError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    throw error;
  }

  return NextResponse.json({ message: "Paket berhasil diperbarui." });
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
  const packageId = Number(id);

  if (!Number.isInteger(packageId) || packageId <= 0) {
    return NextResponse.json(
      { message: "ID paket tidak valid." },
      { status: 400 }
    );
  }

  await deletePartnerPackage(authorized.userId, packageId);

  return NextResponse.json({ message: "Paket berhasil dihapus." });
}
