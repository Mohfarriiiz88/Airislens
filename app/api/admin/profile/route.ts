import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  getAdminPartnerProfile,
  upsertAdminPartnerProfile,
} from "@/lib/partner-cms";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const profile = await getAdminPartnerProfile(authorized.userId);

  if (!profile) {
    return NextResponse.json(
      { message: "Akun partner tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    brandName?: string;
    description?: string;
    specializations?: string[];
    address?: string;
    whatsapp?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    website?: string;
    profilePhotoUrl?: string;
  };

  const brandName = body.brandName?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const whatsapp = body.whatsapp?.trim() ?? "";

  if (!brandName) {
    return NextResponse.json(
      { message: "Nama brand wajib diisi." },
      { status: 400 }
    );
  }

  const profile = await upsertAdminPartnerProfile(authorized.userId, {
    brandName,
    description,
    specializations: Array.isArray(body.specializations)
      ? body.specializations.map((item) => item.trim()).filter(Boolean)
      : [],
    address,
    whatsapp,
    instagram: body.instagram?.trim() ?? "",
    tiktok: body.tiktok?.trim() ?? "",
    facebook: body.facebook?.trim() ?? "",
    website: body.website?.trim() ?? "",
    profilePhotoUrl: body.profilePhotoUrl?.trim() ?? "",
  });

  if (!profile) {
    return NextResponse.json(
      { message: "Akun partner tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Profil partner berhasil disimpan.",
    profile,
  });
}
