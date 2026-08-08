import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/auth/users";
import {
  getWhatsAppValidationServiceErrorMessage,
  requireRegisteredWhatsAppNumber,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

type ProfileUpdateRequestBody = {
  email?: string;
  name?: string;
  phone?: string;
};

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProfileUpdateRequestBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const rawPhone = body.phone?.trim() ?? "";

    if (!name || !email) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi." },
        { status: 400 }
      );
    }

    let normalizedPhone = "";

    if (rawPhone) {
      try {
        normalizedPhone = await requireRegisteredWhatsAppNumber(rawPhone);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nomor WhatsApp tidak valid.";

        return NextResponse.json(
          { message },
          {
            status:
              message === getWhatsAppValidationServiceErrorMessage()
                ? 503
                : 400,
          }
        );
      }
    }

    const userId = Number(session.sub);

    await updateUserProfile({
      id: userId,
      name,
      email,
      phone: normalizedPhone,
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error("PATCH /api/profile ERROR:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}
