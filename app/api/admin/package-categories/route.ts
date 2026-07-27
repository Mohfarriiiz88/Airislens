import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  PartnerCategoryValidationError,
  createPartnerCategory,
  listPartnerCategories,
} from "@/lib/partner-cms";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const categories = await listPartnerCategories(authorized.userId);

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };

  try {
    const category = await createPartnerCategory(authorized.userId, {
      name: body.name?.trim() ?? "",
    });

    return NextResponse.json({
      message: "Kategori berhasil ditambahkan.",
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
