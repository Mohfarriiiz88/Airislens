import { NextResponse } from "next/server";

import { requireSessionWithRole } from "@/lib/auth/access";
import {
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

  await updatePartnerPackage(authorized.userId, packageId, {
    name,
    duration,
    price,
    description,
  });

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
