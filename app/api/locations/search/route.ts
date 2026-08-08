import { NextResponse } from "next/server";

import { LocationSearchError, searchLocations } from "@/lib/location-search";

export const runtime = "nodejs";

type LocationSearchRequestBody = {
  query?: string;
  limit?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LocationSearchRequestBody;
    const query = body.query?.trim() ?? "";
    const limit = Number(body.limit);

    const results = await searchLocations(
      query,
      Number.isInteger(limit) && limit > 0 ? limit : 6
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof LocationSearchError) {
      return NextResponse.json(
        { message: error.message, results: [] },
        { status: error.status }
      );
    }

    console.error("POST /api/locations/search ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Tidak dapat mencari lokasi saat ini. Silakan coba kembali atau tentukan titik melalui peta.",
        results: [],
      },
      { status: 500 }
    );
  }
}
