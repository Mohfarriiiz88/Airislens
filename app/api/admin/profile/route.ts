import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
  getAdminPartnerProfile,
  type PartnerType,
  upsertAdminPartnerProfile,
} from "@/lib/partner-cms";

function parseOptionalCoordinate(
  value: unknown,
  label: string,
  min: number,
  max: number
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
    throw new Error(`${label} tidak valid.`);
  }

  return numericValue;
}

function parseNonNegativeNumber(
  value: unknown,
  label: string,
  fallback: number,
  integerOnly = false
) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    (integerOnly && !Number.isInteger(numericValue))
  ) {
    throw new Error(`${label} tidak valid.`);
  }

  return numericValue;
}

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
    latitude?: number | string | null;
    longitude?: number | string | null;
    freeDistanceKm?: number | string | null;
    flatTransportFee?: number | string | null;
    partnerType?: PartnerType;
    teamQuota?: number | string | null;
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
  const partnerType: PartnerType =
    body.partnerType === "studio" ? "studio" : "individual";

  if (!brandName) {
    return NextResponse.json(
      { message: "Nama brand wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const latitude = parseOptionalCoordinate(
      body.latitude,
      "Latitude fotografer",
      -90,
      90
    );
    const longitude = parseOptionalCoordinate(
      body.longitude,
      "Longitude fotografer",
      -180,
      180
    );

    if ((latitude === null) !== (longitude === null)) {
      return NextResponse.json(
        {
          message:
            "Latitude dan longitude fotografer harus diisi bersamaan atau dikosongkan bersamaan.",
        },
        { status: 400 }
      );
    }

    const freeDistanceKm = parseNonNegativeNumber(
      body.freeDistanceKm,
      "Jarak gratis transport",
      5
    );
    const flatTransportFee = parseNonNegativeNumber(
      body.flatTransportFee,
      "Biaya transportasi jika melebihi batas",
      0,
      true
    );
    const teamQuota =
      partnerType === "individual"
        ? 1
        : parseNonNegativeNumber(body.teamQuota, "Kuota tim", 1, true);

    const profile = await upsertAdminPartnerProfile(authorized.userId, {
      brandName,
      description,
      specializations: Array.isArray(body.specializations)
        ? body.specializations.map((item) => item.trim()).filter(Boolean)
        : [],
      address,
      whatsapp,
      latitude,
      longitude,
      freeDistanceKm,
      flatTransportFee,
      partnerType,
      teamQuota,
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
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Data profil partner tidak valid.",
      },
      { status: 400 }
    );
  }
}
