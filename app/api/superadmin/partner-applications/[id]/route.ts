import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { findUserById, updateUserRole } from "@/lib/auth/users";
import { getDbPool } from "@/lib/db";
import {
  buildPartnerApplicationApprovedMessage,
  buildPartnerApplicationRejectedMessage,
} from "@/lib/partner-application-shared";
import {
  getPartnerApplicationById,
  reviewPartnerApplication,
} from "@/lib/partner-applications";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";

type ReviewRequestBody = {
  status?: string;
  rejectionReason?: string;
};

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

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { message: "ID pengajuan tidak valid." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ReviewRequestBody;
    const status =
      body.status === "approved" || body.status === "rejected"
        ? body.status
        : null;
    const rejectionReason = body.rejectionReason?.trim() ?? "";

    if (!status) {
      return NextResponse.json(
        { message: "Status review tidak valid." },
        { status: 400 }
      );
    }

    if (status === "rejected" && !rejectionReason) {
      return NextResponse.json(
        { message: "Alasan penolakan wajib diisi." },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const connection = await pool.getConnection();

    let application = null;
    let notificationTargetPhone: string | null = null;

    try {
      await connection.beginTransaction();

      application = await getPartnerApplicationById(id, connection);

      if (!application) {
        await connection.rollback();
        return NextResponse.json(
          { message: "Pengajuan tidak ditemukan." },
          { status: 404 }
        );
      }

      if (application.status !== "pending") {
        await connection.rollback();
        return NextResponse.json(
          { message: "Pengajuan ini sudah pernah ditinjau." },
          { status: 409 }
        );
      }

      if (status === "approved") {
        await updateUserRole(
          {
            id: application.submittedByUserId,
            role: "admin",
          },
          connection
        );
      }

      const reviewedApplication = await reviewPartnerApplication(
        {
          id,
          status,
          reviewedByUserId: Number(session.sub),
          rejectionReason: status === "rejected" ? rejectionReason : null,
        },
        connection
      );

      if (!reviewedApplication) {
        throw new Error("Pengajuan gagal dimuat ulang setelah ditinjau.");
      }

      await connection.commit();
      application = reviewedApplication;
      const submittedUser = await findUserById(
        reviewedApplication.submittedByUserId,
        connection
      );
      notificationTargetPhone = submittedUser?.phone?.trim() || null;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    if (application && notificationTargetPhone) {
      try {
        const message =
          status === "approved"
            ? buildPartnerApplicationApprovedMessage({
                name: application.applicantName,
                partnerType: application.partnerType,
              })
            : buildPartnerApplicationRejectedMessage({
                name: application.applicantName,
                partnerType: application.partnerType,
                rejectionReason,
              });
        const notificationResult = await sendWhatsAppMessage({
          target: notificationTargetPhone,
          message,
        });

        if (!notificationResult.ok) {
          throw new Error(
            notificationResult.body?.detail ||
              notificationResult.rawBody ||
              `HTTP ${notificationResult.status}`
          );
        }
      } catch (notificationError) {
        console.error("PARTNER APPLICATION REVIEW WHATSAPP ERROR:", notificationError);
      }
    }

    return NextResponse.json({
      message:
        status === "approved"
          ? "Pengajuan berhasil disetujui."
          : "Pengajuan berhasil ditolak.",
      application,
    });
  } catch (error) {
    console.error("PATCH /api/superadmin/partner-applications/[id] ERROR:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memproses pengajuan." },
      { status: 500 }
    );
  }
}
