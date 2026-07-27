import { NextResponse } from "next/server";

import {
  getPartnerBookingProfile,
  listPartnerCategories,
  listPartnerPackages,
} from "@/lib/partner-cms";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { message: "Invalid partner ID", packages: [], categories: [] },
        { status: 400 }
      );
    }

    const partnerId = Number.parseInt(id, 10);

    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      return NextResponse.json(
        {
          message: "Partner ID must be a valid number",
          packages: [],
          categories: [],
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawCategoryId = searchParams.get("categoryId");
    const categoryId =
      rawCategoryId === null || rawCategoryId.trim() === ""
        ? null
        : Number(rawCategoryId);

    if (
      categoryId !== null &&
      (!Number.isInteger(categoryId) || categoryId <= 0)
    ) {
      return NextResponse.json(
        {
          message: "Category ID must be a valid number",
          packages: [],
          categories: [],
        },
        { status: 400 }
      );
    }

    const [partnerProfile, categories, packages] = await Promise.all([
      getPartnerBookingProfile(partnerId),
      listPartnerCategories(partnerId),
      listPartnerPackages(partnerId, categoryId),
    ]);

    if (!partnerProfile) {
      return NextResponse.json(
        {
          message: "Fotografer tidak ditemukan.",
          partner: null,
          categories: [],
          packages: [],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      partner: {
        userId: partnerProfile.userId,
        brandName: partnerProfile.brandName,
        address: partnerProfile.address,
      },
      categories,
      packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data paket.", packages: [], categories: [] },
      { status: 500 }
    );
  }
}
