import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import {
  findUserByEmail,
  findUserById,
  updateUserProfile,
} from "@/lib/auth/users";
import { getOptionalSuperadminEmail } from "@/lib/env";
import {
  buildPartnerApplicationSubmittedMessage,
  getPartnerApplicationDeclarations,
  PARTNER_TERMS_ERROR_MESSAGE,
  PARTNER_TERMS_VERSION,
  type PartnerApplicationKind,
  type PartnerApplicationStatus,
} from "@/lib/partner-application-shared";
import {
  declarationsAreAccepted,
  isDriveUrl,
  isGoogleMapsUrl,
  isInstagramUrl,
  isValidHttpUrl,
  MAX_PARTNER_APPLICATION_ABOUT_LENGTH,
  normalizeBankAccountNumber,
  normalizeOptionalString,
  normalizeServices,
  normalizeString,
  parseEstablishedYear,
  parsePartnerType,
  PARTNER_APPLICATION_EMAIL_PATTERN,
  partnerTermsAreAccepted,
  validateBankAccountNumber,
  validateIndonesianWhatsAppPhone,
} from "@/lib/partner-application-validation";
import {
  createPartnerApplication,
  findPendingPartnerApplicationByUserId,
  listPartnerApplications,
} from "@/lib/partner-applications";
import { assertOwnedUploadUrl, UploadError } from "@/lib/uploads";
import {
  getWhatsAppValidationServiceErrorMessage,
  requireRegisteredWhatsAppNumber,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

type PartnerApplicationRequestBody = {
  partnerType?: PartnerApplicationKind;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  domicileCity?: string;
  address?: string;
  brandName?: string;
  services?: string[];
  experience?: string;
  instagramUrl?: string;
  portfolioUrl?: string;
  about?: string;
  mapsUrl?: string;
  websiteUrl?: string;
  establishedYear?: string | number | null;
  studioPhone?: string;
  declarationAccepted?: boolean;
  acceptedDeclarations?: string[];
  termsAccepted?: boolean;
  termsVersion?: string;
  bankName?: string;
  bankAccountNumber?: string;
  cvFileUrl?: string;
};

function validatePayload(body: PartnerApplicationRequestBody) {
  const partnerType = parsePartnerType(body.partnerType);

  if (!partnerType) {
    return { error: "Jenis mitra tidak valid." as const };
  }

  const applicantName = normalizeString(body.applicantName);
  const applicantEmail = normalizeString(body.applicantEmail).toLowerCase();
  const applicantPhone = normalizeString(body.applicantPhone);
  const domicileCity = normalizeString(body.domicileCity);
  const address = normalizeString(body.address);
  const brandName = normalizeString(body.brandName);
  const services = normalizeServices(body.services);
  const experience = normalizeString(body.experience);
  const instagramUrl = normalizeString(body.instagramUrl);
  const portfolioUrl = normalizeString(body.portfolioUrl);
  const about = normalizeString(body.about);
  const mapsUrl = normalizeOptionalString(body.mapsUrl);
  const websiteUrl = normalizeOptionalString(body.websiteUrl);
  const studioPhone = normalizeString(body.studioPhone);
  const bankName = normalizeString(body.bankName);
  const bankAccountNumber = normalizeBankAccountNumber(body.bankAccountNumber);
  const cvFileUrl = normalizeString(body.cvFileUrl);
  const establishedYear = parseEstablishedYear(body.establishedYear);
  const declarationAccepted = body.declarationAccepted === true;
  const declarations = getPartnerApplicationDeclarations(partnerType);
  if (!applicantName || !applicantEmail || !applicantPhone) {
    return { error: "Nama, email, dan nomor WhatsApp wajib diisi." as const };
  }

  if (!PARTNER_APPLICATION_EMAIL_PATTERN.test(applicantEmail)) {
    return { error: "Format email tidak valid." as const };
  }

  const applicantPhoneError = validateIndonesianWhatsAppPhone(applicantPhone);

  if (applicantPhoneError) {
    return { error: applicantPhoneError };
  }

  if (!domicileCity || !address) {
    return { error: "Domisili/kota dan alamat wajib diisi." as const };
  }

  if (services.length === 0) {
    return { error: "Pilih minimal satu spesialisasi layanan." as const };
  }

  if (!experience) {
    return { error: "Lama pengalaman wajib diisi." as const };
  }

  if (!instagramUrl || !isInstagramUrl(instagramUrl)) {
    return { error: "Link Instagram tidak valid." as const };
  }

  if (!portfolioUrl || !isDriveUrl(portfolioUrl)) {
    return { error: "Link Google Drive portofolio tidak valid." as const };
  }

  if (!about) {
    return { error: "Bagian deskripsi wajib diisi." as const };
  }

  if (about.length > MAX_PARTNER_APPLICATION_ABOUT_LENGTH) {
    return { error: "Deskripsi terlalu panjang." as const };
  }

  if (
    !declarationAccepted ||
    !declarationsAreAccepted(partnerType, body.acceptedDeclarations)
  ) {
    return {
      error: "Semua pernyataan dan deklarasi wajib disetujui." as const,
    };
  }

  if (!partnerTermsAreAccepted(body.termsAccepted, body.termsVersion)) {
    return {
      error: PARTNER_TERMS_ERROR_MESSAGE,
    };
  }

  if (!bankName) {
    return { error: "Nama bank wajib diisi." as const };
  }

  const bankAccountNumberError = validateBankAccountNumber(bankAccountNumber);

  if (bankAccountNumberError) {
    return { error: bankAccountNumberError };
  }

  if (!cvFileUrl) {
    return { error: "CV wajib diunggah." as const };
  }

  if (partnerType === "studio") {
    if (!brandName) {
      return { error: "Nama studio wajib diisi." as const };
    }

    const studioPhoneError = validateIndonesianWhatsAppPhone(
      studioPhone,
      "Nomor WhatsApp studio"
    );

    if (studioPhoneError) {
      return { error: studioPhoneError };
    }

    if (!mapsUrl || !isGoogleMapsUrl(mapsUrl)) {
      return { error: "Link Google Maps studio tidak valid." as const };
    }

    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      return { error: "Website studio tidak valid." as const };
    }

    if (!establishedYear) {
      return { error: "Tahun berdiri studio tidak valid." as const };
    }
  }

  return {
    value: {
      applicantName,
      applicantEmail,
      applicantPhone,
      partnerType,
      domicileCity,
      address,
      brandName,
      services,
      experience,
      instagramUrl,
      portfolioUrl,
      about,
      mapsUrl,
      websiteUrl,
      studioPhone,
      establishedYear,
      declarations,
      termsVersion: PARTNER_TERMS_VERSION,
      bankName,
      bankAccountNumber,
      cvFileUrl,
    },
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    if (session.role !== "user") {
      return NextResponse.json(
        { message: "Akun ini sudah memiliki akses mitra atau admin." },
        { status: 403 }
      );
    }

    const userId = Number(session.sub);

    if (!userId) {
      return NextResponse.json(
        { message: "User ID tidak ditemukan." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PartnerApplicationRequestBody;
    const validation = validatePayload(body);

    if ("error" in validation) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      partnerType,
      domicileCity,
      address,
      brandName,
      services,
      experience,
      instagramUrl,
      portfolioUrl,
      about,
      mapsUrl,
      websiteUrl,
      studioPhone,
      establishedYear,
      declarations,
      termsVersion,
      bankName,
      bankAccountNumber,
      cvFileUrl,
    } = validation.value;

    const user = await findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    const pendingApplication = await findPendingPartnerApplicationByUserId(userId);

    if (pendingApplication) {
      return NextResponse.json(
        {
          message:
            "Anda masih memiliki pengajuan verifikasi yang sedang menunggu peninjauan.",
        },
        { status: 409 }
      );
    }

    const reservedSuperadminEmail = getOptionalSuperadminEmail();

    if (reservedSuperadminEmail && applicantEmail === reservedSuperadminEmail) {
      return NextResponse.json(
        {
          message:
            "Email ini dicadangkan untuk akun superadmin dan tidak dapat digunakan pada pengajuan mitra.",
        },
        { status: 403 }
      );
    }

    if (applicantEmail !== user.email) {
      const existingUser = await findUserByEmail(applicantEmail);

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { message: "Email sudah digunakan oleh akun lain." },
          { status: 409 }
        );
      }
    }

    await assertOwnedUploadUrl(cvFileUrl, {
      kind: "partner-cv",
      userId,
    });

    let normalizedApplicantPhone: string;
    let normalizedStudioPhone: string | null = null;

    try {
      normalizedApplicantPhone = await requireRegisteredWhatsAppNumber(
        applicantPhone
      );
      normalizedStudioPhone = studioPhone
        ? await requireRegisteredWhatsAppNumber(
            studioPhone,
            "Nomor WhatsApp studio"
          )
        : null;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Format nomor WhatsApp tidak valid.";

      return NextResponse.json(
        { message },
        {
          status:
            message === getWhatsAppValidationServiceErrorMessage() ? 503 : 400,
        }
      );
    }

    const currentUserPhone = user.phone ?? "";

    if (
      applicantName !== user.name ||
      applicantEmail !== user.email ||
      normalizedApplicantPhone !== currentUserPhone
    ) {
      await updateUserProfile({
        id: userId,
        name: applicantName,
        email: applicantEmail,
        phone: normalizedApplicantPhone,
      });
    }

    const application = await createPartnerApplication(
      {
        applicantName,
        applicantEmail,
        applicantPhone: normalizedApplicantPhone,
        partnerType,
        domicileCity,
        address,
        brandName,
        services,
        experience,
        instagramUrl,
        portfolioUrl,
        about,
        mapsUrl,
        websiteUrl,
        establishedYear,
        studioPhone: normalizedStudioPhone,
        declarations,
        declarationAcceptedAt: new Date(),
        termsVersion,
        bankName,
        bankAccountNumber,
        cvFileUrl,
      },
      userId
    );

    try {
      const notificationResult = await sendWhatsAppMessage({
        target: normalizedApplicantPhone,
        message: buildPartnerApplicationSubmittedMessage({
          name: applicantName,
          partnerType,
        }),
      });

      if (!notificationResult.ok) {
        throw new Error(
          notificationResult.body?.detail ||
            notificationResult.rawBody ||
            `HTTP ${notificationResult.status}`
        );
      }
    } catch (notificationError) {
      console.error("PARTNER APPLICATION SUBMISSION WHATSAPP ERROR:", notificationError);
    }

    return NextResponse.json(
      {
        message: "Pengajuan verifikasi berhasil dikirim.",
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    console.error("POST /api/partner-applications ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengirim pengajuan." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PartnerApplicationStatus | null;
    const applications = await listPartnerApplications(
      status && ["pending", "approved", "rejected"].includes(status)
        ? status
        : undefined
    );

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("GET /api/partner-applications ERROR:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data pengajuan." },
      { status: 500 }
    );
  }
}
