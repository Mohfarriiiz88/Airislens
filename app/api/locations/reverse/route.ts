import { NextResponse } from "next/server";

import {
  LocationSearchError,
  reverseGeocodeLocation,
} from "@/lib/location-search";

export const runtime = "nodejs";

type ReverseLocationRequestBody = {
  latitude?: number;
  longitude?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReverseLocationRequestBody;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const location = await reverseGeocodeLocation(latitude, longitude);

    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof LocationSearchError) {
      return NextResponse.json(
        { message: error.message, location: null },
        { status: error.status }
      );
    }

    console.error("POST /api/locations/reverse ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Titik lokasi sudah dipilih, tetapi nama lokasinya belum dapat dimuat saat ini.",
        location: null,
      },
      { status: 500 }
    );
  }
}
