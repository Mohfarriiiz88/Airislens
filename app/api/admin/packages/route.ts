import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import { createPartnerPackage, listPartnerPackages } from "@/lib/partner-cms";

export async function GET() {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const packages = await listPartnerPackages(authorized.userId);

  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  const authorized = await requireSessionWithRole(["admin"]);

  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    duration?: string;
    price?: number;
    description?: string;
  };

  const name = body.name?.trim() ?? "";
  const duration = body.duration?.trim() ?? "";
  const price = Number(body.price ?? 0);
  const description = body.description?.trim() ?? "";

  if (!name || !duration || price <= 0) {
    return NextResponse.json(
      { message: "Nama, durasi, dan harga paket wajib diisi." },
      { status: 400 }
    );
  }

  const partnerPackage = await createPartnerPackage(authorized.userId, {
    name,
    duration,
    price,
    description,
  });

  return NextResponse.json({
    message: "Paket berhasil ditambahkan.",
    package: partnerPackage,
  });
}
