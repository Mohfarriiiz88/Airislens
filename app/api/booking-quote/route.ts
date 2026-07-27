import { NextResponse } from "next/server";

import { BookingPricingError, getBookingQuote } from "@/lib/booking-pricing";

export const runtime = "nodejs";

type BookingQuoteRequestBody = {
  photographerId?: number;
  categoryId?: number;
  packageId?: number;
  eventAddress?: string;
  eventLatitude?: number;
  eventLongitude?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingQuoteRequestBody;
    const quote = await getBookingQuote({
      photographerUserId: Number(body.photographerId),
      categoryId: Number(body.categoryId),
      packageId: Number(body.packageId),
      eventAddress: body.eventAddress ?? "",
      eventLatitude: Number(body.eventLatitude),
      eventLongitude: Number(body.eventLongitude),
    });

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof BookingPricingError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("BOOKING QUOTE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menghitung rincian booking." },
      { status: 500 }
    );
  }
}
