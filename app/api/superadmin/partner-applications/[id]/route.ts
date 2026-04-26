import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getPartnerApplicationById,
  updatePartnerApplicationStatus,
} from "@/lib/partner-applications";
import { updateUserRole } from "@/lib/auth/users";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const id = Number(params.id);
    const body = await request.json();
    const status = body.status;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Status tidak valid." },
        { status: 400 }
      );
    }

    const application = await getPartnerApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { message: "Aplikasi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 🔥 UPDATE STATUS
    await updatePartnerApplicationStatus(id, status);

    // 🔥 INI KUNCI UTAMA
    if (status === "approved") {
      if (!application.submittedByUserId) {
        return NextResponse.json(
          { message: "User ID tidak ditemukan di application." },
          { status: 400 }
        );
      }

      await updateUserRole({
        id: application.submittedByUserId, // 🔥 HARUS id
        role: "admin",
      });
    }

    return NextResponse.json({
      message:
        status === "approved"
          ? "Approved & user menjadi admin"
          : "Rejected",
    });
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}