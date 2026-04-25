import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getAuthCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail, toSafeUser } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const safeUser = toSafeUser(user);
    const token = await createSessionToken(safeUser);
    const response = NextResponse.json({
      message: "Login berhasil.",
      user: safeUser,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat login." },
      { status: 500 }
    );
  }
}
