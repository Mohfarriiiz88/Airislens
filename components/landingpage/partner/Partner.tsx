"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  getPartnerApplicationDeclarations,
  getPartnerTypeDescription,
  getPartnerTypeLabel,
  PARTNER_APPLICATION_SERVICE_OPTIONS,
  PARTNER_TERMS_APPROVAL_LABEL,
  PARTNER_TERMS_CLAUSES,
  PARTNER_TERMS_VERSION,
  type PartnerApplicationKind,
} from "@/lib/partner-application-shared";
import {
  declarationsAreAccepted,
  isDriveUrl,
  isGoogleMapsUrl,
  isInstagramUrl,
  isValidHttpUrl,
  MAX_PARTNER_APPLICATION_ABOUT_LENGTH,
  parseEstablishedYear,
  PARTNER_BANK_ACCOUNT_HELPER_TEXT,
  PARTNER_CV_HELPER_TEXT,
  PARTNER_APPLICATION_EMAIL_PATTERN,
  PARTNER_APPLICATION_PHONE_HELPER_TEXT,
  validateBankAccountNumber,
  validateIndonesianWhatsAppPhone,
} from "@/lib/partner-application-validation";

type IdentityForm = {
  name: string;
  email: string;
  phone: string;
};

type PartnerPageUser = IdentityForm & {
  role: "superadmin" | "admin" | "user";
  canApplyPartner: boolean;
  hasPendingPartnerApplication: boolean;
};

type PartnerForm = {
  domicileCity: string;
  address: string;
  brandName: string;
  bankName: string;
  bankAccountNumber: string;
  services: string[];
  experience: string;
  instagramUrl: string;
  portfolioUrl: string;
  about: string;
  mapsUrl: string;
  websiteUrl: string;
  establishedYear: string;
  studioPhone: string;
};

const EMPTY_FORM: PartnerForm = {
  domicileCity: "",
  address: "",
  brandName: "",
  bankName: "",
  bankAccountNumber: "",
  services: [],
  experience: "",
  instagramUrl: "",
  portfolioUrl: "",
  about: "",
  mapsUrl: "",
  websiteUrl: "",
  establishedYear: "",
  studioPhone: "",
};

type PartnerFieldErrorKey =
  | "applicantName"
  | "applicantEmail"
  | "applicantPhone"
  | "domicileCity"
  | "address"
  | "brandName"
  | "bankName"
  | "bankAccountNumber"
  | "services"
  | "experience"
  | "instagramUrl"
  | "portfolioUrl"
  | "about"
  | "mapsUrl"
  | "websiteUrl"
  | "establishedYear"
  | "studioPhone"
  | "cvFile"
  | "acceptedDeclarations";

type PartnerFieldErrors = Partial<Record<PartnerFieldErrorKey, string>>;
type PhoneValidationState = {
  status: "idle" | "checking" | "valid" | "invalid" | "error";
  message: string | null;
  normalizedPhone: string | null;
};

type ValidateWhatsAppResponse = {
  message?: string;
  phone?: string;
  valid?: boolean;
};

type UploadCvResponse = {
  message?: string;
  url?: string;
};

const IDLE_PHONE_VALIDATION_STATE: PhoneValidationState = {
  status: "idle",
  message: null,
  normalizedPhone: null,
};

function validatePartnerApplicationForm(input: {
  partnerType: PartnerApplicationKind | null;
  identity: IdentityForm;
  form: PartnerForm;
  acceptedDeclarations: string[];
  hasCvFile: boolean;
}) {
  const { partnerType, identity, form, acceptedDeclarations, hasCvFile } = input;
  const errors: PartnerFieldErrors = {};

  if (!partnerType) {
    return errors;
  }

  const applicantName = identity.name.trim();
  const applicantEmail = identity.email.trim().toLowerCase();
  const domicileCity = form.domicileCity.trim();
  const address = form.address.trim();
  const brandName = form.brandName.trim();
  const bankName = form.bankName.trim();
  const bankAccountNumber = form.bankAccountNumber.trim();
  const experience = form.experience.trim();
  const instagramUrl = form.instagramUrl.trim();
  const portfolioUrl = form.portfolioUrl.trim();
  const about = form.about.trim();
  const mapsUrl = form.mapsUrl.trim();
  const websiteUrl = form.websiteUrl.trim();

  if (!applicantName) {
    errors.applicantName =
      partnerType === "studio"
        ? "Nama penanggung jawab wajib diisi."
        : "Nama lengkap wajib diisi.";
  }

  if (!applicantEmail) {
    errors.applicantEmail = "Email wajib diisi.";
  } else if (!PARTNER_APPLICATION_EMAIL_PATTERN.test(applicantEmail)) {
    errors.applicantEmail = "Format email tidak valid.";
  }

  const applicantPhoneError = validateIndonesianWhatsAppPhone(identity.phone);

  if (applicantPhoneError) {
    errors.applicantPhone = applicantPhoneError;
  }

  if (!domicileCity) {
    errors.domicileCity =
      partnerType === "studio"
        ? "Kota / domisili wajib diisi."
        : "Domisili / kota wajib diisi.";
  }

  if (!address) {
    errors.address =
      partnerType === "studio"
        ? "Alamat studio wajib diisi."
        : "Alamat wajib diisi.";
  }

  if (partnerType === "studio" && !brandName) {
    errors.brandName = "Nama studio wajib diisi.";
  }

  if (!bankName) {
    errors.bankName = "Nama bank wajib diisi.";
  }

  const bankAccountNumberError = validateBankAccountNumber(bankAccountNumber);

  if (bankAccountNumberError) {
    errors.bankAccountNumber = bankAccountNumberError;
  }

  if (form.services.length === 0) {
    errors.services = "Pilih minimal satu spesialisasi layanan.";
  }

  if (!experience) {
    errors.experience = "Lama pengalaman wajib diisi.";
  }

  if (!instagramUrl) {
    errors.instagramUrl =
      partnerType === "studio"
        ? "Link Instagram studio wajib diisi."
        : "Link Instagram profesional wajib diisi.";
  } else if (!isInstagramUrl(instagramUrl)) {
    errors.instagramUrl =
      partnerType === "studio"
        ? "Link Instagram studio tidak valid."
        : "Link Instagram profesional tidak valid.";
  }

  if (!portfolioUrl) {
    errors.portfolioUrl = "Link Google Drive portofolio wajib diisi.";
  } else if (!isDriveUrl(portfolioUrl)) {
    errors.portfolioUrl = "Link Google Drive portofolio tidak valid.";
  }

  if (!hasCvFile) {
    errors.cvFile = "CV wajib diunggah.";
  }

  if (!about) {
    errors.about =
      partnerType === "studio"
        ? "Tentang studio wajib diisi."
        : "Tentang saya wajib diisi.";
  } else if (about.length > MAX_PARTNER_APPLICATION_ABOUT_LENGTH) {
    errors.about = `Deskripsi maksimal ${MAX_PARTNER_APPLICATION_ABOUT_LENGTH} karakter.`;
  }

  if (partnerType === "studio") {
    const studioPhoneError = validateIndonesianWhatsAppPhone(
      form.studioPhone,
      "Nomor WhatsApp studio"
    );

    if (studioPhoneError) {
      errors.studioPhone = studioPhoneError;
    }

    if (!mapsUrl) {
      errors.mapsUrl = "Link Google Maps studio wajib diisi.";
    } else if (!isGoogleMapsUrl(mapsUrl)) {
      errors.mapsUrl = "Link Google Maps studio tidak valid.";
    }

    if (!form.establishedYear.trim()) {
      errors.establishedYear = "Tahun berdiri wajib diisi.";
    } else if (!parseEstablishedYear(form.establishedYear)) {
      errors.establishedYear = "Tahun berdiri studio tidak valid.";
    }

    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      errors.websiteUrl = "Website studio tidak valid.";
    }
  }

  if (!declarationsAreAccepted(partnerType, acceptedDeclarations)) {
    errors.acceptedDeclarations =
      "Semua pernyataan dan deklarasi wajib disetujui.";
  }

  return errors;
}

function getFirstValidationError(errors: PartnerFieldErrors) {
  return Object.values(errors)[0] ?? null;
}

function getPhoneValidationMessage(
  state: PhoneValidationState,
  currentValue: string
) {
  if (!currentValue.trim()) {
    return null;
  }

  if (state.status === "idle") {
    return "Belum diperiksa.";
  }

  return state.message;
}

function getPhoneValidationTone(state: PhoneValidationState) {
  if (state.status === "valid") {
    return "success" as const;
  }

  if (state.status === "invalid" || state.status === "error") {
    return "error" as const;
  }

  return "neutral" as const;
}

export default function Partner() {
  const [partnerType, setPartnerType] = useState<PartnerApplicationKind | null>(
    null
  );
  const [identity, setIdentity] = useState<IdentityForm>({
    name: "",
    email: "",
    phone: "",
  });
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [acceptedDeclarations, setAcceptedDeclarations] = useState<string[]>([]);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(
    null
  );
  const [applicantPhoneValidation, setApplicantPhoneValidation] =
    useState<PhoneValidationState>(IDLE_PHONE_VALIDATION_STATE);
  const [studioPhoneValidation, setStudioPhoneValidation] =
    useState<PhoneValidationState>(IDLE_PHONE_VALIDATION_STATE);
  const [errors, setErrors] = useState<PartnerFieldErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalError, setTermsModalError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploadedUrl, setCvUploadedUrl] = useState("");
  const [cvUploadedName, setCvUploadedName] = useState("");
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvUploadStatus, setCvUploadStatus] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          setRequiresLogin(true);
          setMessage({
            type: "error",
            text: "Silakan login terlebih dahulu untuk mengajukan verifikasi mitra.",
          });
          return;
        }

        const data = (await response.json()) as {
          user?: PartnerPageUser;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil data akun.");
        }

        const user = data.user;

        setIdentity({
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
        });

        if (!user) {
          throw new Error("Data akun tidak ditemukan.");
        }

        if (user.role !== "user") {
          setEligibilityMessage(
            "Halaman pendaftaran mitra hanya tersedia untuk akun pelanggan."
          );
          return;
        }

        if (user.hasPendingPartnerApplication || !user.canApplyPartner) {
          setEligibilityMessage(
            "Anda masih memiliki pengajuan verifikasi mitra yang sedang menunggu peninjauan."
          );
          return;
        }

        setEligibilityMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat mengambil data akun.",
        });
      } finally {
        setLoadingIdentity(false);
      }
    };

    fetchUser();
  }, []);

  const declarations = partnerType
    ? getPartnerApplicationDeclarations(partnerType)
    : [];
  const allDeclarationsAccepted = partnerType
    ? declarationsAreAccepted(partnerType, acceptedDeclarations)
    : false;
  const isApplicationBlocked = Boolean(eligibilityMessage);
  const hasUploadedCv = Boolean(cvFile) || Boolean(cvUploadedUrl);

  function closeTermsModal() {
    if (submitting) {
      return;
    }

    setTermsModalOpen(false);
    setTermsAccepted(false);
    setTermsModalError(null);
  }

  async function validatePhoneValue(options: {
    label: string;
    phone: string;
    setState: Dispatch<SetStateAction<PhoneValidationState>>;
  }) {
    const trimmedPhone = options.phone.trim();

    if (!trimmedPhone) {
      options.setState(IDLE_PHONE_VALIDATION_STATE);
      return {
        valid: true,
        message: null,
      };
    }

    const phoneFormatError = validateIndonesianWhatsAppPhone(
      trimmedPhone,
      options.label
    );

    if (phoneFormatError) {
      options.setState({
        status: "invalid",
        message: phoneFormatError,
        normalizedPhone: null,
      });
      return {
        valid: false,
        message: phoneFormatError,
      };
    }

    options.setState({
      status: "checking",
      message: "Memeriksa nomor WhatsApp...",
      normalizedPhone: null,
    });

    try {
      const response = await fetch("/api/whatsapp/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: trimmedPhone,
        }),
      });
      const data = (await response.json()) as ValidateWhatsAppResponse;

      if (response.ok && data.valid && data.phone) {
        options.setState({
          status: "valid",
          message: "Nomor terdaftar di WhatsApp.",
          normalizedPhone: data.phone,
        });
        return {
          valid: true,
          message: null,
        };
      }

      if (response.status === 400) {
        const invalidMessage =
          data.message || `${options.label} tidak valid.`;

        options.setState({
          status: "invalid",
          message: invalidMessage,
          normalizedPhone: data.phone ?? null,
        });
        return {
          valid: false,
          message: invalidMessage,
        };
      }

      if (response.status === 503 || response.status === 429) {
        const serviceMessage =
          data.message ||
          "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.";

        options.setState({
          status: "error",
          message: serviceMessage,
          normalizedPhone: data.phone ?? null,
        });
        return {
          valid: false,
          message: serviceMessage,
        };
      }

      const notRegisteredMessage =
        data.message || "Nomor tidak terdaftar di WhatsApp.";

      options.setState({
        status: "invalid",
        message: notRegisteredMessage,
        normalizedPhone: data.phone ?? null,
      });
      return {
        valid: false,
        message: notRegisteredMessage,
      };
    } catch (error) {
      console.error("PARTNER WHATSAPP VALIDATION ERROR:", error);
      const fallbackMessage =
        "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.";

      options.setState({
        status: "error",
        message: fallbackMessage,
        normalizedPhone: null,
      });
      return {
        valid: false,
        message: fallbackMessage,
      };
    }
  }

  async function ensureApplicantPhoneValidated() {
    if (applicantPhoneValidation.status === "valid") {
      return {
        valid: true,
        message: null,
      };
    }

    return validatePhoneValue({
      label: "Nomor WhatsApp",
      phone: identity.phone,
      setState: setApplicantPhoneValidation,
    });
  }

  async function ensureStudioPhoneValidated() {
    if (studioPhoneValidation.status === "valid") {
      return {
        valid: true,
        message: null,
      };
    }

    return validatePhoneValue({
      label: "Nomor WhatsApp studio",
      phone: form.studioPhone,
      setState: setStudioPhoneValidation,
    });
  }

  function syncValidation(
    nextIdentity = identity,
    nextForm = form,
    nextAcceptedDeclarations = acceptedDeclarations,
    nextPartnerType = partnerType,
    nextHasCvFile = hasUploadedCv
  ) {
    if (!hasAttemptedSubmit) {
      return;
    }

    setErrors(
      validatePartnerApplicationForm({
        partnerType: nextPartnerType,
        identity: nextIdentity,
        form: nextForm,
        acceptedDeclarations: nextAcceptedDeclarations,
        hasCvFile: nextHasCvFile,
      })
    );
  }

  function handleIdentityChange(field: keyof IdentityForm, value: string) {
    const nextIdentity = {
      ...identity,
      [field]: value,
    };

    setIdentity(nextIdentity);
    setMessage(null);
    if (field === "phone") {
      setApplicantPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
    }
    syncValidation(nextIdentity);
  }

  function handleFormChange(field: keyof PartnerForm, value: string | string[]) {
    const nextForm = {
      ...form,
      [field]: value,
    };

    setForm(nextForm);
    setMessage(null);
    if (field === "studioPhone") {
      setStudioPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
    }
    syncValidation(identity, nextForm);
  }

  function handleCvFileChange(file: File | null) {
    setCvFile(file);
    setCvUploadedUrl("");
    setCvUploadedName(file?.name ?? "");
    setCvUploadError(null);
    setCvUploadStatus("idle");
    setMessage(null);
    syncValidation(identity, form, acceptedDeclarations, partnerType, Boolean(file));
  }

  function toggleService(service: string) {
    const nextServices = form.services.includes(service)
      ? form.services.filter((item) => item !== service)
      : [...form.services, service];
    const nextForm = {
      ...form,
      services: nextServices,
    };

    setForm(nextForm);
    setMessage(null);
    syncValidation(identity, nextForm);
  }

  function toggleDeclaration(item: string) {
    const nextAcceptedDeclarations = acceptedDeclarations.includes(item)
      ? acceptedDeclarations.filter((current) => current !== item)
      : [...acceptedDeclarations, item];

    setAcceptedDeclarations(nextAcceptedDeclarations);
    setMessage(null);
    syncValidation(identity, form, nextAcceptedDeclarations);
  }

  function selectPartnerType(nextType: PartnerApplicationKind) {
    setPartnerType(nextType);
    setAcceptedDeclarations([]);
    setTermsModalOpen(false);
    setTermsAccepted(false);
    setTermsModalError(null);
    setMessage(null);
    setStudioPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
    setErrors(
      hasAttemptedSubmit
        ? validatePartnerApplicationForm({
            partnerType: nextType,
            identity,
            form,
            acceptedDeclarations: [],
            hasCvFile: hasUploadedCv,
          })
        : {}
    );
  }

  async function handleSubmit() {
    if (!partnerType) {
      setMessage({
        type: "error",
        text: "Pilih jenis mitra terlebih dahulu.",
      });
      return;
    }

    const applicantPhoneCheck = await ensureApplicantPhoneValidated();

    if (!applicantPhoneCheck.valid) {
      setMessage({
        type: "error",
        text:
          applicantPhoneCheck.message ||
          "Nomor WhatsApp belum dapat diverifikasi.",
      });
      return;
    }

    if (partnerType === "studio") {
      const studioPhoneCheck = await ensureStudioPhoneValidated();

      if (!studioPhoneCheck.valid) {
        setMessage({
          type: "error",
          text:
            studioPhoneCheck.message ||
            "Nomor WhatsApp studio belum dapat diverifikasi.",
        });
        return;
      }
    }

    const nextErrors = validatePartnerApplicationForm({
      partnerType,
      identity,
      form,
      acceptedDeclarations,
      hasCvFile: hasUploadedCv,
    });

    setHasAttemptedSubmit(true);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setMessage({
        type: "error",
        text:
          getFirstValidationError(nextErrors) ||
          "Periksa kembali data pengajuan Anda.",
      });
      return;
    }

    setMessage(null);
    setTermsAccepted(false);
    setTermsModalError(null);
    setTermsModalOpen(true);
  }

  async function uploadCvIfNeeded() {
    if (cvUploadedUrl && !cvFile) {
      return cvUploadedUrl;
    }

    if (!cvFile) {
      throw new Error("CV wajib diunggah.");
    }

    setCvUploadStatus("uploading");
    setCvUploadError(null);

    const uploadBody = new FormData();
    uploadBody.append("file", cvFile);

    const response = await fetch("/api/partner-applications/uploads", {
      method: "POST",
      body: uploadBody,
    });
    const data = (await response.json()) as UploadCvResponse;

    if (!response.ok || !data.url) {
      const errorMessage = data.message || "Gagal mengunggah CV.";

      setCvUploadStatus("idle");
      setCvUploadError(errorMessage);
      throw new Error(errorMessage);
    }

    setCvUploadedUrl(data.url);
    setCvUploadedName(cvFile.name);
    setCvFile(null);
    setCvUploadStatus("uploaded");

    return data.url;
  }

  async function confirmPartnerApplicationSubmission() {
    if (!partnerType || !termsAccepted) {
      return;
    }

    setSubmitting(true);
    setTermsModalError(null);
    setMessage(null);

    try {
      const cvFileUrl = await uploadCvIfNeeded();
      const response = await fetch("/api/partner-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerType,
          applicantName: identity.name,
          applicantEmail: identity.email,
          applicantPhone: identity.phone,
          domicileCity: form.domicileCity,
          address: form.address,
          brandName: form.brandName,
          services: form.services,
          experience: form.experience,
          instagramUrl: form.instagramUrl,
          portfolioUrl: form.portfolioUrl,
          about: form.about,
          mapsUrl: partnerType === "studio" ? form.mapsUrl : "",
          websiteUrl: partnerType === "studio" ? form.websiteUrl : "",
          establishedYear: partnerType === "studio" ? form.establishedYear : "",
          studioPhone: partnerType === "studio" ? form.studioPhone : "",
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          cvFileUrl,
          declarationAccepted: true,
          acceptedDeclarations,
          termsAccepted: true,
          termsVersion: PARTNER_TERMS_VERSION,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || "Gagal mengirim pengajuan.";

        setTermsModalError(errorMessage);
        throw new Error(errorMessage);
      }

      setTermsModalOpen(false);
      setTermsAccepted(false);
      setTermsModalError(null);
      setMessage({
        type: "success",
        text:
          data.message ||
          "Pengajuan verifikasi berhasil dikirim. Tim AirisLens akan meninjau data Anda.",
      });
      setErrors({});
      setHasAttemptedSubmit(false);
      setApplicantPhoneValidation((prev) =>
        prev.status === "valid" ? prev : IDLE_PHONE_VALIDATION_STATE
      );
      setStudioPhoneValidation((prev) =>
        prev.status === "valid" ? prev : IDLE_PHONE_VALIDATION_STATE
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim pengajuan.";

      setTermsModalError((prev) => prev ?? errorMessage);
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 py-16 font-[NeueHaas] text-black md:px-20"
    >
      <div className="mt-10 max-w-4xl">
        <p className="text-sm uppercase tracking-[0.22em] text-black/45">
          Verifikasi Mitra
        </p>
        <h1 className="mt-4 text-[28px] leading-tight md:text-[48px]">
          Daftar sebagai Mitra dengan verifikasi manual
        </h1>
        <p className="mt-4 text-[18px] leading-relaxed text-black/75 md:text-[20px]">
          Pengajuan mitra tidak otomatis memberikan akses fotografer. Tim
          AirisLens akan memverifikasi identitas, akun profesional, dan
          portofolio Anda terlebih dahulu.
        </p>
      </div>

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {isApplicationBlocked ? (
            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <h2 className="text-[22px] text-black">
                Pendaftaran Mitra Tidak Tersedia
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-black/70">
                {eligibilityMessage}
              </p>
              <div className="mt-6">
                <Link
                  href="/profile"
                  className="inline-flex rounded-xl bg-black px-4 py-3 text-sm text-white transition hover:bg-black/85"
                >
                  Kembali ke Profil
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-[28px] border border-black/10 bg-white p-6">
                <h2 className="text-[22px] text-black">Pilih Jenis Mitra</h2>
                <p className="mt-2 text-sm text-black/60">
                  Pilih kategori mitra yang paling sesuai. Form akan menyesuaikan
                  kebutuhan verifikasi.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(["individual", "studio"] as PartnerApplicationKind[]).map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => selectPartnerType(item)}
                        className={`rounded-[24px] border p-5 text-left transition ${
                          partnerType === item
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black hover:border-black/40"
                        }`}
                      >
                        <div className="text-lg">
                          {item === "studio"
                            ? "Studio Foto"
                            : "Fotografer Perorangan"}
                        </div>
                        <p
                          className={`mt-3 text-sm leading-relaxed ${
                            partnerType === item
                              ? "text-white/80"
                              : "text-black/60"
                          }`}
                        >
                          {getPartnerTypeDescription(item)}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </section>

              {partnerType ? (
                <>
              <section className="rounded-[28px] border border-black/10 bg-white p-6">
                <h2 className="text-[22px] text-black">
                  {partnerType === "studio"
                    ? "Informasi Penanggung Jawab"
                    : "Informasi Pribadi"}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      partnerType === "studio"
                        ? "Nama Penanggung Jawab *"
                        : "Nama Lengkap *"
                    }
                    value={identity.name}
                    onChange={(value) => handleIdentityChange("name", value)}
                    disabled={loadingIdentity || requiresLogin}
                    errorText={errors.applicantName}
                  />
                  <Field
                    label="Email *"
                    type="email"
                    value={identity.email}
                    onChange={(value) => handleIdentityChange("email", value)}
                    disabled={loadingIdentity || requiresLogin}
                    errorText={errors.applicantEmail}
                  />
                  <Field
                    label="Nomor WhatsApp *"
                    type="tel"
                    value={identity.phone}
                    onBlur={() => void ensureApplicantPhoneValidated()}
                    onChange={(value) => handleIdentityChange("phone", value)}
                    placeholder="08xxxxxxxxxx"
                    helperText={PARTNER_APPLICATION_PHONE_HELPER_TEXT}
                    statusMessage={getPhoneValidationMessage(
                      applicantPhoneValidation,
                      identity.phone
                    )}
                    statusTone={getPhoneValidationTone(
                      applicantPhoneValidation
                    )}
                    inputMode="numeric"
                    disabled={loadingIdentity || requiresLogin}
                    errorText={errors.applicantPhone}
                  />
                  <Field
                    label={
                      partnerType === "studio"
                        ? "Kota / Domisili *"
                        : "Domisili / Kota *"
                    }
                    value={form.domicileCity}
                    onChange={(value) => handleFormChange("domicileCity", value)}
                    disabled={requiresLogin}
                    errorText={errors.domicileCity}
                  />
                </div>

                <div className="mt-4">
                  <TextareaField
                    label={
                      partnerType === "studio"
                        ? "Alamat Studio *"
                        : "Alamat *"
                    }
                    value={form.address}
                    onChange={(value) => handleFormChange("address", value)}
                    disabled={requiresLogin}
                    errorText={errors.address}
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-black/10 bg-white p-6">
                <h2 className="text-[22px] text-black">
                  {partnerType === "studio"
                    ? "Informasi Studio"
                    : "Informasi Fotografer"}
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      partnerType === "studio"
                        ? "Nama Studio *"
                        : "Nama Profesional / Brand"
                    }
                    value={form.brandName}
                    onChange={(value) => handleFormChange("brandName", value)}
                    disabled={requiresLogin}
                    errorText={errors.brandName}
                  />
                  {partnerType === "studio" ? (
                    <Field
                      label="Tahun Berdiri *"
                      value={form.establishedYear}
                      onChange={(value) =>
                        handleFormChange("establishedYear", value)
                      }
                      placeholder="contoh: 2020"
                      inputMode="numeric"
                      disabled={requiresLogin}
                      errorText={errors.establishedYear}
                    />
                  ) : null}

                  {partnerType === "studio" ? (
                    <Field
                      label="Nomor WhatsApp Studio *"
                      type="tel"
                      value={form.studioPhone}
                      onBlur={() => void ensureStudioPhoneValidated()}
                      onChange={(value) => handleFormChange("studioPhone", value)}
                      placeholder="08xxxxxxxxxx"
                      helperText={PARTNER_APPLICATION_PHONE_HELPER_TEXT}
                      statusMessage={getPhoneValidationMessage(
                        studioPhoneValidation,
                        form.studioPhone
                      )}
                      statusTone={getPhoneValidationTone(studioPhoneValidation)}
                      inputMode="numeric"
                      disabled={requiresLogin}
                      errorText={errors.studioPhone}
                    />
                  ) : null}

                  <Field
                    label="Nama Bank *"
                    value={form.bankName}
                    onChange={(value) => handleFormChange("bankName", value)}
                    placeholder="contoh: BCA"
                    disabled={requiresLogin}
                    errorText={errors.bankName}
                  />

                  <Field
                    label="Nomor Rekening *"
                    value={form.bankAccountNumber}
                    onChange={(value) =>
                      handleFormChange("bankAccountNumber", value)
                    }
                    placeholder="contoh: 1234567890"
                    helperText={PARTNER_BANK_ACCOUNT_HELPER_TEXT}
                    inputMode="numeric"
                    disabled={requiresLogin}
                    errorText={errors.bankAccountNumber}
                  />

                  <Field
                    label="Lama Pengalaman *"
                    value={form.experience}
                    onChange={(value) => handleFormChange("experience", value)}
                    placeholder={
                      partnerType === "studio"
                        ? "contoh: 5 tahun beroperasi"
                        : "contoh: 3 tahun"
                    }
                    disabled={requiresLogin}
                    errorText={errors.experience}
                  />

                  <Field
                    label={
                      partnerType === "studio"
                        ? "Instagram Studio *"
                        : "Instagram Profesional *"
                    }
                    type="url"
                    value={form.instagramUrl}
                    onChange={(value) => handleFormChange("instagramUrl", value)}
                    placeholder="https://instagram.com/username"
                    disabled={requiresLogin}
                    errorText={errors.instagramUrl}
                  />

                  {partnerType === "studio" ? (
                    <Field
                      label="Website Studio"
                      type="url"
                      value={form.websiteUrl}
                      onChange={(value) => handleFormChange("websiteUrl", value)}
                      placeholder="https://studioanda.com"
                      disabled={requiresLogin}
                      errorText={errors.websiteUrl}
                    />
                  ) : null}
                </div>

                <div className="mt-6">
                  <MultiCheckboxField
                    label={
                      partnerType === "studio"
                        ? "Layanan Studio *"
                        : "Spesialisasi Fotografi *"
                    }
                    values={form.services}
                    onToggle={toggleService}
                    options={[...PARTNER_APPLICATION_SERVICE_OPTIONS]}
                    disabled={requiresLogin}
                    errorText={errors.services}
                  />
                </div>

                <div className="mt-6">
                  <TextareaField
                    label={
                      partnerType === "studio"
                        ? "Tentang Studio *"
                        : "Tentang Saya *"
                    }
                    value={form.about}
                    onChange={(value) => handleFormChange("about", value)}
                    disabled={requiresLogin}
                    helperText={
                      partnerType === "studio"
                        ? `Tuliskan tentang studio Anda dan pengalaman studio Anda di dunia fotografi. Maksimal ${MAX_PARTNER_APPLICATION_ABOUT_LENGTH} karakter.`
                        : `Tuliskan tentang Anda dan pengalaman Anda di dunia fotografer. Maksimal ${MAX_PARTNER_APPLICATION_ABOUT_LENGTH} karakter.`
                    }
                    errorText={errors.about}
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-black/10 bg-white p-6">
                <h2 className="text-[22px] text-black">
                  {partnerType === "studio"
                    ? "Verifikasi Studio"
                    : "Verifikasi Portofolio"}
                </h2>

                <div className="mt-6 grid gap-4">
                  {partnerType === "studio" ? (
                    <Field
                      label="Link Google Maps / Lokasi Studio *"
                      type="url"
                      value={form.mapsUrl}
                      onChange={(value) => handleFormChange("mapsUrl", value)}
                      placeholder="https://maps.app.goo.gl/..."
                      disabled={requiresLogin}
                      errorText={errors.mapsUrl}
                    />
                  ) : null}

                  <Field
                    label="Link Portofolio Google Drive *"
                    type="url"
                    value={form.portfolioUrl}
                    onChange={(value) => handleFormChange("portfolioUrl", value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    helperText={
                      partnerType === "studio"
                        ? "Masukkan link Google Drive yang berisi minimal 3-5 hasil karya studio. Pastikan link dapat diakses oleh siapa saja yang memiliki link."
                        : "Masukkan link Google Drive yang berisi minimal 3-5 hasil karya fotografi Anda. Pastikan akses diatur agar dapat dilihat oleh siapa saja yang memiliki link."
                    }
                    disabled={requiresLogin}
                    errorText={errors.portfolioUrl}
                  />

                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                    <label className="block">
                      <span className="text-sm text-black">Upload CV *</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) =>
                          handleCvFileChange(event.target.files?.[0] ?? null)
                        }
                        disabled={requiresLogin || submitting}
                        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-black outline-none transition disabled:cursor-not-allowed disabled:bg-black/[0.04] ${
                          errors.cvFile
                            ? "border-red-400 focus:border-red-500"
                            : "border-black/15 focus:border-black"
                        }`}
                      />
                    </label>
                    <p className="mt-2 text-xs leading-relaxed text-black/50">
                      {PARTNER_CV_HELPER_TEXT}
                    </p>
                    {cvUploadedName ? (
                      <p className="mt-2 text-xs leading-relaxed text-black/65">
                        File dipilih: <span className="font-medium">{cvUploadedName}</span>
                      </p>
                    ) : null}
                    {cvUploadStatus === "uploaded" && cvUploadedUrl ? (
                      <p className="mt-2 text-xs leading-relaxed text-green-700">
                        CV sudah tersimpan dan siap dikirim bersama pengajuan.
                      </p>
                    ) : null}
                    {cvUploadStatus === "uploading" ? (
                      <p className="mt-2 text-xs leading-relaxed text-black/55">
                        Mengunggah CV...
                      </p>
                    ) : null}
                    {cvUploadError ? (
                      <p className="mt-2 text-xs leading-relaxed text-red-600">
                        {cvUploadError}
                      </p>
                    ) : null}
                    {errors.cvFile ? (
                      <p className="mt-2 text-xs leading-relaxed text-red-600">
                        {errors.cvFile}
                      </p>
                    ) : null}
                  </div>

                  <InfoBox>
                    {partnerType === "studio"
                      ? "Data Google Maps, Instagram, dan portofolio akan digunakan oleh Superadmin untuk memeriksa bahwa studio benar-benar memiliki aktivitas fotografi."
                      : "Data Google Drive dan Instagram akan digunakan oleh Superadmin sebagai bahan verifikasi manual."}
                  </InfoBox>
                </div>
              </section>

              <section className="rounded-[28px] border border-black/10 bg-white p-6">
                <h2 className="text-[22px] text-black">
                  Pernyataan dan Deklarasi
                </h2>
                <div className="mt-6 space-y-4">
                  {declarations.map((item) => (
                    <label
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-black/10 px-4 py-4 text-sm leading-relaxed text-black/80"
                    >
                      <input
                        type="checkbox"
                        checked={acceptedDeclarations.includes(item)}
                        onChange={() => toggleDeclaration(item)}
                        disabled={requiresLogin}
                        className="mt-1"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                {errors.acceptedDeclarations ? (
                  <p className="mt-4 text-sm text-red-600">
                    {errors.acceptedDeclarations}
                  </p>
                ) : null}

                <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4 text-sm leading-relaxed text-black/70">
                  Dengan mengirim pengajuan ini, Anda memahami bahwa
                  pendaftaran tidak secara otomatis memberikan akses sebagai{" "}
                  {getPartnerTypeLabel(partnerType).toLowerCase()}. Tim
                  AirisLens akan melakukan verifikasi terlebih dahulu terhadap
                  informasi dan portofolio yang diberikan.
                </div>
              </section>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    message.type === "success"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    requiresLogin ||
                    loadingIdentity ||
                    submitting ||
                    applicantPhoneValidation.status === "checking" ||
                    studioPhoneValidation.status === "checking"
                  }
                  className="rounded-xl bg-black px-6 py-4 text-sm text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Mengirim pengajuan..."
                    : partnerType === "studio"
                      ? "Ajukan Verifikasi Studio"
                      : "Ajukan Verifikasi Fotografer"}
                </button>

                <p className="text-sm text-black/50">
                  {allDeclarationsAccepted
                    ? "Setelah data valid, Anda akan diminta menyetujui Pernyataan & Persetujuan Mitra AirisLens sebelum pengajuan dikirim."
                    : "Lengkapi seluruh data dan setujui semua deklarasi wajib sebelum melanjutkan ke persetujuan akhir."}
                </p>
              </div>
                </>
              ) : null}
            </>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/10 bg-white p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-black/45">
              Checklist Verifikasi
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-black/75">
              <li>Identitas pendaftar harus lengkap dan aktif dihubungi.</li>
              <li>Instagram profesional/studio harus valid dan relevan.</li>
              <li>Google Drive harus memuat portofolio yang bisa ditinjau.</li>
              <li>Pengajuan akan masuk ke status menunggu verifikasi.</li>
              <li>Role akun baru berubah setelah disetujui Superadmin.</li>
            </ul>
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-black/45">
              Alur Review
            </p>
            <div className="mt-5 space-y-4 text-sm text-black/75">
              <div>
                <div className="font-medium text-black">1. Kirim Pengajuan</div>
                <p className="mt-1">
                  Anda melengkapi formulir dan menyetujui deklarasi yang wajib.
                </p>
              </div>
              <div>
                <div className="font-medium text-black">2. Verifikasi Manual</div>
                <p className="mt-1">
                  Tim AirisLens meninjau identitas, akun profesional, dan
                  portofolio yang Anda lampirkan.
                </p>
              </div>
              <div>
                <div className="font-medium text-black">3. Hasil Review</div>
                <p className="mt-1">
                  Anda akan menerima notifikasi WhatsApp ketika pengajuan
                  disetujui atau ditolak.
                </p>
              </div>
            </div>
          </section>

          {requiresLogin ? (
            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <div className="text-sm text-black/75">
                Anda perlu login sebelum mengajukan verifikasi mitra.
              </div>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-xl bg-black px-4 py-3 text-sm text-white transition hover:bg-black/85"
              >
                Login
              </Link>
            </section>
          ) : null}
        </aside>
      </div>

      {termsModalOpen ? (
        <PartnerTermsModal
          accepted={termsAccepted}
          error={termsModalError}
          loading={submitting}
          onAcceptedChange={setTermsAccepted}
          onClose={closeTermsModal}
          onSubmit={() => void confirmPartnerApplicationSubmission()}
        />
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  helperText,
  statusMessage,
  statusTone = "neutral",
  errorText,
  type = "text",
  inputMode,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  helperText?: string;
  statusMessage?: string | null;
  statusTone?: "neutral" | "success" | "error";
  errorText?: string;
  type?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  disabled?: boolean;
}) {
  const statusClass =
    statusTone === "success"
      ? "text-green-600"
      : statusTone === "error"
        ? "text-red-600"
        : "text-black/45";

  return (
    <label className="block">
      <span className="text-sm text-black">{label}</span>
      <input
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        aria-invalid={Boolean(errorText)}
        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-black outline-none transition disabled:cursor-not-allowed disabled:bg-black/[0.04] ${
          errorText
            ? "border-red-400 focus:border-red-500"
            : "border-black/15 focus:border-black"
        }`}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-relaxed text-black/50">
          {helperText}
        </span>
      ) : null}
      {statusMessage ? (
        <span className={`mt-2 block text-xs leading-relaxed ${statusClass}`}>
          {statusMessage}
        </span>
      ) : null}
      {errorText ? (
        <span className="mt-2 block text-xs leading-relaxed text-red-600">
          {errorText}
        </span>
      ) : null}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  helperText,
  errorText,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-black">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={5}
        aria-invalid={Boolean(errorText)}
        className={`mt-2 min-h-[140px] w-full rounded-xl border px-4 py-3 text-sm text-black outline-none transition disabled:cursor-not-allowed disabled:bg-black/[0.04] ${
          errorText
            ? "border-red-400 focus:border-red-500"
            : "border-black/15 focus:border-black"
        }`}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-relaxed text-black/50">
          {helperText}
        </span>
      ) : null}
      {errorText ? (
        <span className="mt-2 block text-xs leading-relaxed text-red-600">
          {errorText}
        </span>
      ) : null}
    </label>
  );
}

function MultiCheckboxField({
  label,
  values,
  onToggle,
  options,
  disabled = false,
  errorText,
}: {
  label: string;
  values: string[];
  onToggle: (value: string) => void;
  options: string[];
  disabled?: boolean;
  errorText?: string;
}) {
  return (
    <div>
      <p className="text-sm text-black">{label}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-black/80"
          >
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => onToggle(option)}
              disabled={disabled}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {errorText ? (
        <p className="mt-3 text-xs leading-relaxed text-red-600">{errorText}</p>
      ) : null}
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4 text-sm leading-relaxed text-black/65">
      {children}
    </div>
  );
}

function PartnerTermsModal({
  accepted,
  error,
  loading,
  onAcceptedChange,
  onClose,
  onSubmit,
}: {
  accepted: boolean;
  error: string | null;
  loading: boolean;
  onAcceptedChange: (value: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="border-b border-black/10 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-black/40">
            Persetujuan Mitra
          </p>
          <h3 className="mt-2 text-2xl text-black">
            Pernyataan & Persetujuan Mitra AirisLens
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-black/60">
            Sebelum mengajukan verifikasi sebagai mitra AirisLens, harap
            membaca dan menyetujui ketentuan berikut.
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {PARTNER_TERMS_CLAUSES.map((item, index) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/10 px-4 py-4"
              >
                <p className="text-sm font-medium text-black">
                  {index + 1}. {item.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-black/70">
                  {item.statement}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4">
            <label className="flex items-start gap-3 text-sm leading-relaxed text-black/80">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => onAcceptedChange(event.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>{PARTNER_TERMS_APPROVAL_LABEL}</span>
            </label>
            <p className="mt-3 text-xs text-black/45">
              Versi persetujuan: {PARTNER_TERMS_VERSION}
            </p>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-black/10 px-6 py-5 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-black/15 px-4 py-3 text-sm text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !accepted}
            className="rounded-xl bg-black px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Mengirim pengajuan..." : "Setujui & Ajukan Verifikasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
