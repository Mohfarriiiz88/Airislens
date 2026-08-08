import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifyJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { findPendingPartnerApplicationByUserId } from "@/lib/partner-applications";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const session = await verifyJwt(token);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const user = await findUserById(Number(session.sub));

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    const hasPendingPartnerApplication =
      user.role === "user"
        ? Boolean(await findPendingPartnerApplicationByUserId(user.id))
        : false;
    const canApplyPartner =
      user.role === "user" && !hasPendingPartnerApplication;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        canApplyPartner,
        hasPendingPartnerApplication,
      },
    });
  } catch (error) {
    console.error("ME API ERROR:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
