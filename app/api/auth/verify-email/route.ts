import { NextResponse } from "next/server";

import { hashEmailVerificationToken } from "@/lib/auth/email-verification";
import {
  findUserByVerificationToken,
  markUserEmailVerified,
} from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        { message: "Token tidak valid." },
        { status: 400 }
      );
    }

    const user = await findUserByVerificationToken(
      hashEmailVerificationToken(token)
    );

    if (!user) {
      return NextResponse.json(
        { message: "Token tidak valid." },
        { status: 400 }
      );
    }

    if (
      !user.verification_expires_at ||
      new Date(user.verification_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { message: "Token sudah kedaluwarsa." },
        { status: 410 }
      );
    }

    await markUserEmailVerified(user.id);

    return NextResponse.json({
      message: "Email berhasil diverifikasi. Silakan login.",
    });
  } catch (error) {
    console.error("Verify email failed:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat memverifikasi email." },
      { status: 500 }
    );
  }
}
