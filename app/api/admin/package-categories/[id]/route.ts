import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  PartnerCategoryInUseError,
  PartnerCategoryValidationError,
  deletePartnerCategory,
  updatePartnerCategory,
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
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json(
      { message: "ID kategori tidak valid." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as { name?: string };

  try {
    const category = await updatePartnerCategory(authorized.userId, categoryId, {
      name: body.name?.trim() ?? "",
    });

    return NextResponse.json({
      message: "Kategori berhasil diperbarui.",
      category,
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
  const categoryId = Number(id);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json(
      { message: "ID kategori tidak valid." },
      { status: 400 }
    );
  }

  try {
    await deletePartnerCategory(authorized.userId, categoryId);
  } catch (error) {
    if (error instanceof PartnerCategoryInUseError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({ message: "Kategori berhasil dihapus." });
}
