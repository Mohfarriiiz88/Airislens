import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createPartnerApplication, listPartnerApplications } from "@/lib/partner-applications";

// ======================
// POST (SUBMIT)
// ======================
export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    console.log("SESSION:", session);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      email,
      phone,
      location,
      category,
      experience,
      portfolioLink,
      aboutYou,
    } = body;

    if (
      !name ||
      !email ||
      !phone ||
      !location ||
      !category ||
      !experience ||
      !portfolioLink ||
      !aboutYou
    ) {
      return NextResponse.json(
        { message: "Semua field harus diisi." },
        { status: 400 }
      );
    }

    // 🔥 FIX FINAL (SESION KAMU PAKAI sub)
    const userId = Number((session as any).sub);

    if (!userId) {
      console.log("SESSION ERROR:", session);
      return NextResponse.json(
        { message: "User ID tidak ditemukan." },
        { status: 401 }
      );
    }

    const application = await createPartnerApplication(
      {
        name,
        email,
        phone,
        location,
        category,
        experience,
        portfolioLink,
        aboutYou,
        submittedByUserId: userId, // tidak dipakai di insert tapi tetap aman
      },
      userId // 🔥 ini yang dipakai oleh DB
    );

    return NextResponse.json(
      { message: "Pengajuan berhasil dikirim.", application },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json({ message: "Gagal submit." }, { status: 500 });
  }
}

// ======================
// GET (SUPERADMIN)
// ======================
export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const applications = await listPartnerApplications(status || undefined);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("GET ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data." },
      { status: 500 }
    );
  }
}