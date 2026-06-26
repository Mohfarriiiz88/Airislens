import { NextResponse } from "next/server";
import { type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";

type PackageRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  duration: string;
  price: number;
  description: string;
};

type PartnerRow = RowDataPacket & {
  user_id: number;
  brand_name: string;
  address: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id === "undefined") {
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
    const [partnerRows] = await pool.execute<PartnerRow[]>(
      `
        SELECT
          p.user_id,
          COALESCE(NULLIF(p.brand_name, ''), u.name) AS brand_name,
          p.address
        FROM partner_profiles p
        INNER JOIN users u ON u.id = p.user_id
        WHERE u.role = 'admin'
          AND p.user_id = ?
        LIMIT 1
      `,
      [partnerId]
    );

    const partnerRow = partnerRows[0] ?? null;

    const query = `
      SELECT id, user_id, name, duration, price, description
      FROM partner_packages
      WHERE user_id = ?
      ORDER BY id ASC
    `;

    const [rows] = await pool.execute<PackageRow[]>(query, [partnerId]);

    const packages = rows.map((row) => ({
      id: row.id,
      name: row.name,
      duration: row.duration,
      price: row.price,
      description: row.description,
    }));

    return NextResponse.json({
      partner: partnerRow
        ? {
            userId: partnerRow.user_id,
            brandName: partnerRow.brand_name,
            address: partnerRow.address,
          }
        : null,
      packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data paket.", packages: [] },
      { status: 500 }
    );
  }
}
