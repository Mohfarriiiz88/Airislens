"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { validateIndonesianWhatsAppPhone } from "@/lib/partner-application-validation";

type UserRole = "superadmin" | "admin" | "user" | null;
type PhoneValidationState = {
  status: "idle" | "checking" | "valid" | "invalid" | "error";
  message: string | null;
  normalizedPhone: string | null;
};

type AuthMeResponse = {
  user?: {
    email?: string;
    name?: string;
    phone?: string;
    role?: UserRole;
  };
};

type ValidateWhatsAppResponse = {
  message?: string;
  phone?: string;
  valid?: boolean;
};

const IDLE_PHONE_VALIDATION_STATE: PhoneValidationState = {
  status: "idle",
  message: null,
  normalizedPhone: null,
};

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [phoneValidation, setPhoneValidation] = useState<PhoneValidationState>(
    IDLE_PHONE_VALIDATION_STATE
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "********",
  });
  const [initial, setInitial] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [modal, setModal] = useState<{
    type: "save" | "logout" | null;
  }>({ type: null });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const data = (await res.json()) as AuthMeResponse;

        if (res.ok) {
          const user = data.user;

          setUserRole(user?.role ?? null);
          setForm({
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            password: "********",
          });
          setInitial({
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
          });
          setPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
        }
      } catch (err) {
        console.error("FETCH USER ERROR:", err);
      } finally {
        setFetching(false);
      }
    };

    void fetchUser();
  }, []);

  const isChanged =
    form.name !== initial.name ||
    form.email !== initial.email ||
    form.phone !== initial.phone;
  const dashboardHref =
    userRole === "superadmin"
      ? "/superadmin/dashboard"
      : userRole === "admin"
        ? "/admin/dashboard"
        : null;

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (key === "phone") {
      setPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
    }
  }

  async function validatePhone(phoneValue = form.phone) {
    const trimmedPhone = phoneValue.trim();

    if (!trimmedPhone) {
      setPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
      return true;
    }

    const phoneFormatError = validateIndonesianWhatsAppPhone(trimmedPhone);

    if (phoneFormatError) {
      setPhoneValidation({
        status: "invalid",
        message: phoneFormatError,
        normalizedPhone: null,
      });
      return false;
    }

    setPhoneValidation({
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
        setPhoneValidation({
          status: "valid",
          message: "Nomor terdaftar di WhatsApp.",
          normalizedPhone: data.phone,
        });
        return true;
      }

      if (response.status === 400) {
        setPhoneValidation({
          status: "invalid",
          message: data.message || "Nomor WhatsApp tidak valid.",
          normalizedPhone: data.phone ?? null,
        });
        return false;
      }

      if (response.status === 503 || response.status === 429) {
        setPhoneValidation({
          status: "error",
          message:
            data.message ||
            "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.",
          normalizedPhone: data.phone ?? null,
        });
        return false;
      }

      setPhoneValidation({
        status: "invalid",
        message: data.message || "Nomor tidak terdaftar di WhatsApp.",
        normalizedPhone: data.phone ?? null,
      });
      return false;
    } catch (error) {
      console.error("PROFILE WHATSAPP VALIDATION ERROR:", error);
      setPhoneValidation({
        status: "error",
        message:
          "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.",
        normalizedPhone: null,
      });
      return false;
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      alert("Nama dan email wajib diisi.");
      return;
    }

    if (form.phone.trim()) {
      const isPhoneValid = await validatePhone(form.phone);

      if (!isPhoneValid) {
        return;
      }
    }

    setModal({ type: "save" });
  }

  function handleLogout() {
    setModal({ type: "logout" });
  }

  async function confirmAction() {
    if (modal.type === "save") {
      try {
        setLoading(true);

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
          }),
        });
        const data = (await res.json()) as {
          message?: string;
          phone?: string;
        };

        if (!res.ok) {
          alert(data.message || "Gagal memperbarui profil.");
          return;
        }

        const savedPhone = data.phone ?? form.phone.trim();

        alert(data.message || "Profil berhasil diperbarui.");
        setForm((prev) => ({
          ...prev,
          name: form.name,
          email: form.email,
          phone: savedPhone,
        }));
        setInitial({
          name: form.name,
          email: form.email,
          phone: savedPhone,
        });
        setPhoneValidation(
          savedPhone
            ? {
                status: "valid",
                message: "Nomor terdaftar di WhatsApp.",
                normalizedPhone: savedPhone,
              }
            : IDLE_PHONE_VALIDATION_STATE
        );

        router.refresh();
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    }

    if (modal.type === "logout") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
        });
      } finally {
        router.push("/");
        router.refresh();
      }
    }

    setModal({ type: null });
  }

  if (fetching) {
    return (
      <section
        data-navbar-tone="dark"
        className="min-h-screen mt-10 flex items-center justify-center bg-white px-6 py-16 font-[NeueHaas] text-black md:px-20"
      >
        Memuat profil...
      </section>
    );
  }

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen mt-10 bg-white px-6 py-16 font-[NeueHaas] text-black md:px-20"
    >
      <div className="mb-12">
        <h1 className="mb-2 text-[24px] md:text-[40px]">Pengaturan Profil</h1>
        <p className="text-[18px] md:text-[20px]">
          Kelola informasi pribadi Anda
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <EditableField
          label="Nama Lengkap"
          value={form.name}
          onChange={(value) => update("name", value)}
        />

        <EditableField
          label="Email"
          value={form.email}
          onChange={(value) => update("email", value)}
          type="email"
        />

        <EditableField
          label="Nomor WhatsApp"
          value={form.phone}
          onBlur={() => void validatePhone()}
          onChange={(value) => update("phone", value)}
          helperText="Nomor ini akan digunakan sebagai tujuan notifikasi WhatsApp AirisLens."
          inputMode="numeric"
          placeholder="08xxxxxxxxxx"
          statusMessage={getPhoneValidationMessage(phoneValidation)}
          statusTone={getPhoneValidationTone(phoneValidation)}
          type="tel"
        />

        <EditableField
          label="Password"
          value={form.password}
          onChange={(value) => update("password", value)}
          type="password"
        />

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => void handleSave()}
            disabled={
              !isChanged || loading || phoneValidation.status === "checking"
            }
            className="rounded-md bg-black px-6 py-3 text-[16px] text-white transition hover:bg-black/80 disabled:opacity-60"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>

          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className="rounded-md border border-black bg-white px-6 py-3 text-[16px] text-black transition hover:bg-black hover:text-white"
            >
              {userRole === "superadmin"
                ? "Dashboard Admin Utama"
                : "Dashboard Fotografer"}
            </Link>
          ) : null}

          <button
            onClick={handleLogout}
            className="rounded-md border border-black px-6 py-3 text-[16px] text-black transition hover:bg-black hover:text-white"
          >
            Keluar
          </button>
        </div>
      </div>

      {modal.type ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[90%] max-w-sm rounded-lg bg-white p-8 text-center">
            <h2 className="mb-3 text-[20px]">
              {modal.type === "save" ? "Simpan Perubahan?" : "Keluar?"}
            </h2>

            <p className="mb-6 text-[16px]">
              {modal.type === "save"
                ? "Apakah Anda yakin ingin memperbarui profil?"
                : "Apakah Anda yakin ingin keluar?"}
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setModal({ type: null })}
                className="rounded-md border px-5 py-2"
              >
                Batal
              </button>

              <button
                onClick={() => void confirmAction()}
                className="rounded-md bg-black px-5 py-2 text-white"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getPhoneValidationMessage(state: PhoneValidationState) {
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

function EditableField({
  label,
  value,
  onChange,
  onBlur,
  helperText,
  statusMessage,
  statusTone = "neutral",
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  helperText?: string;
  statusMessage?: string | null;
  statusTone?: "neutral" | "success" | "error";
  placeholder?: string;
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
}) {
  const statusClass =
    statusTone === "success"
      ? "text-green-600"
      : statusTone === "error"
        ? "text-red-600"
        : "text-black/45";

  return (
    <div>
      <p className="mb-2 text-[14px]">{label}</p>

      <div className="relative">
        <input
          type={type}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-4 py-3 pr-10 focus:border-black focus:outline-none"
        />

        <Pencil
          size={18}
          strokeWidth={1.5}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {helperText ? (
        <p className="mt-2 text-xs leading-relaxed text-black/50">
          {helperText}
        </p>
      ) : null}

      {statusMessage ? (
        <p className={`mt-2 text-xs leading-relaxed ${statusClass}`}>
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
