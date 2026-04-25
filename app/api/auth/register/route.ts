import { NextResponse } from "next/server";

import { hashPassword, validatePassword } from "@/lib/auth/password";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getAuthCookieOptions,
} from "@/lib/auth/session";
import { createUser, findUserByEmail, toSafeUser } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Nama, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 }
      );
    }

    const passwordErrors = validatePassword(password, email);

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { message: passwordErrors[0], errors: passwordErrors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await createUser({
      name,
      email,
      passwordHash,
      role: "user",
    });
    const safeUser = toSafeUser(createdUser);
    const token = await createSessionToken(safeUser);
    const response = NextResponse.json({
      message: "Akun berhasil dibuat.",
      user: safeUser,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Register failed:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat akun." },
      { status: 500 }
    );
  }
}
