import { NextResponse } from "next/server";

import { findUserById, updateUserProfile } from "@/lib/auth/users";
import { getServerSession } from "@/lib/auth/session";
import {
  createPartnerApplication,
  listPartnerApplications,
} from "@/lib/partner-applications";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const userId = Number((session as { sub?: string }).sub);

    if (!userId) {
      return NextResponse.json(
        { message: "User ID tidak ditemukan." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      phone?: string;
      location?: string;
      category?: string;
      experience?: string;
      portfolioLink?: string;
      aboutYou?: string;
    };

    const location = body.location?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const experience = body.experience?.trim() ?? "";
    const portfolioLink = body.portfolioLink?.trim() ?? "";
    const aboutYou = body.aboutYou?.trim() ?? "";

    if (
      !location ||
      !category ||
      !experience ||
      !portfolioLink ||
      !aboutYou
    ) {
      return NextResponse.json(
        { message: "Semua field partner harus diisi." },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    const normalizedPhone = String(body.phone ?? user.phone ?? "").trim();

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          message:
            "Nomor WhatsApp wajib diisi. Lengkapi dari form ini atau halaman profil.",
        },
        { status: 400 }
      );
    }

    if (normalizedPhone !== (user.phone ?? "")) {
      await updateUserProfile({
        id: userId,
        name: user.name,
        email: user.email,
        phone: normalizedPhone,
      });
    }

    const application = await createPartnerApplication(
      {
        location,
        category,
        experience,
        portfolioLink,
        aboutYou,
      },
      userId
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
