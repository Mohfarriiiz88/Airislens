import { NextResponse } from "next/server";

import { getDbPool } from "@/lib/db";

type GalleryItemRow = {
  id: number;
  user_id: number;
  title: string;
  category: string;
  image_url: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const pool = getDbPool();

    let query = `
      SELECT id, user_id, title, category, image_url
      FROM partner_gallery_items
    `;
    const params: string[] = [];

    if (category && category.trim()) {
      query += ` WHERE category = ?`;
      params.push(category.trim());
    }

    query += ` ORDER BY id DESC`;

    const [rows] = await pool.execute<any[]>(query, params);

    const items = rows.map((row: GalleryItemRow) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      imageUrl: row.image_url,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching gallery items:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data galeri." },
      { status: 500 }
    );
  }
}
