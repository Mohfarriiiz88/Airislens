import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { updateUserRole } from "@/lib/auth/users";
import {
  getPartnerApplicationById,
  updatePartnerApplicationStatus,
} from "@/lib/partner-applications";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const body = (await request.json()) as { status?: string };
    const status = body.status;

    if (!["approved", "rejected"].includes(String(status))) {
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

    await updatePartnerApplicationStatus(id, status as "approved" | "rejected");

    if (status === "approved") {
      await updateUserRole({
        id: application.submittedByUserId,
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
