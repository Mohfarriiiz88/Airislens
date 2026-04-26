import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/auth/users";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // 🔥 ambil user id dari JWT
    const userId = Number((session as any).sub);

    await updateUserProfile({
      id: userId,
      name,
      email,
      phone,
    });

    return NextResponse.json({
      message: "Profile berhasil diupdate",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal update profile" },
      { status: 500 }
    );
  }
}