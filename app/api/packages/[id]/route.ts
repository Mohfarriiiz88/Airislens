import { NextResponse } from "next/server";

import { getDbPool } from "@/lib/db";

type PackageRow = {
  id: number;
  user_id: number;
  name: string;
  duration: string;
  price: number;
  description: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log("Packages API - Received ID:", id);

    if (!id || id === "undefined") {
      console.warn("Invalid ID: undefined");
      return NextResponse.json(
        { message: "Invalid partner ID", packages: [] },
        { status: 400 }
      );
    }

    const partnerId = parseInt(id, 10);

    if (isNaN(partnerId) || partnerId <= 0) {
      return NextResponse.json(
        { message: "Partner ID must be a valid number", packages: [] },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    const query = `
      SELECT id, user_id, name, duration, price, description
      FROM partner_packages
      WHERE user_id = ?
      ORDER BY id ASC
    `;

    const [rows] = await pool.execute<any[]>(query, [partnerId]);

    const packages = (rows as PackageRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      duration: row.duration,
      price: row.price,
      description: row.description,
    }));

    console.log(`Packages found for partner ${partnerId}:`, packages.length);

    return NextResponse.json({ packages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data paket.", packages: [] },
      { status: 500 }
    );
  }
}
