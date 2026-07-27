import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  PartnerCategoryValidationError,
  createPartnerPackage,
  listPartnerCategories,
  listPartnerPackages,
} from "@/lib/partner-cms";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const [categories, packages] = await Promise.all([
    listPartnerCategories(authorized.userId),
    listPartnerPackages(authorized.userId),
  ]);

  return NextResponse.json({ categories, packages });
}

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    categoryId?: number;
    name?: string;
    duration?: string;
    price?: number;
    description?: string;
  };

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
    const partnerPackage = await createPartnerPackage(authorized.userId, {
      categoryId,
      name,
      duration,
      price,
      description,
    });

    return NextResponse.json({
      message: "Paket berhasil ditambahkan.",
      package: partnerPackage,
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
