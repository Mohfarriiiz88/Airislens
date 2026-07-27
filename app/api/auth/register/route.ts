import { NextResponse } from "next/server";

import { ensureEmailVerificationSchema } from "@/lib/auth/email-verification-schema";
import { createEmailVerificationToken } from "@/lib/auth/email-verification";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import {
  getMissingEmailVerificationEnvVars,
  getOptionalSuperadminEmail,
} from "@/lib/env";
import { createUser, findUserByEmail } from "@/lib/auth/users";
import { getDbPool } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mailer";

function isDuplicateEntryError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function POST(request: Request) {
  let connection: Awaited<ReturnType<ReturnType<typeof getDbPool>["getConnection"]>> | null =
    null;

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const missingEmailVerificationEnvVars =
      getMissingEmailVerificationEnvVars();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Nama, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (missingEmailVerificationEnvVars.length > 0) {
      return NextResponse.json(
        {
          message: `Konfigurasi verifikasi email belum lengkap. Lengkapi: ${missingEmailVerificationEnvVars.join(", ")}.`,
        },
        { status: 500 }
      );
    }

    await ensureEmailVerificationSchema();

    const existingUser = await findUserByEmail(email);
    const reservedSuperadminEmail = getOptionalSuperadminEmail();

    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 }
      );
    }

    if (reservedSuperadminEmail && email === reservedSuperadminEmail) {
      return NextResponse.json(
        {
          message:
            "Email ini dicadangkan untuk akun superadmin dan tidak bisa dibuat dari register publik.",
        },
        { status: 403 }
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
    const verification = createEmailVerificationToken();

    connection = await getDbPool().getConnection();
    await connection.beginTransaction();

    await createUser(
      {
        name,
        email,
        passwordHash,
        role: "user",
        verificationToken: verification.tokenHash,
        verificationExpiresAt: verification.expiresAt,
      },
      connection
    );

    await sendVerificationEmail({
      email,
      name,
      token: verification.token,
    });

    await connection.commit();

    return NextResponse.json(
      {
        message:
          "Registrasi berhasil. Silakan cek email untuk verifikasi akun.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("Register failed:", error);

    return NextResponse.json(
      {
        message:
          "Terjadi kesalahan saat membuat akun atau mengirim email verifikasi.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
