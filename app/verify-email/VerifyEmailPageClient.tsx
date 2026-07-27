"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type VerifyStatus = "loading" | "success" | "invalid" | "expired" | "error";

export default function VerifyEmailPageClient({
  token,
}: {
  token: string;
}) {
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("Memverifikasi email...");

  useEffect(() => {
    let isCancelled = false;

    async function verifyEmail() {
      if (!token) {
        if (!isCancelled) {
          setStatus("invalid");
          setMessage("Token tidak valid.");
        }

        return;
      }

      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        if (isCancelled) {
          return;
        }

        if (response.ok) {
          setStatus("success");
          setMessage(
            data?.message ?? "Email berhasil diverifikasi. Silakan login."
          );
          return;
        }

        if (response.status === 410) {
          setStatus("expired");
          setMessage(data?.message ?? "Token sudah kedaluwarsa.");
          return;
        }

        if (response.status === 400) {
          setStatus("invalid");
          setMessage(data?.message ?? "Token tidak valid.");
          return;
        }

        setStatus("error");
        setMessage(
          data?.message ?? "Terjadi kesalahan saat memverifikasi email."
        );
      } catch {
        if (!isCancelled) {
          setStatus("error");
          setMessage("Tidak dapat terhubung ke server.");
        }
      }
    }

    void verifyEmail();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] sm:p-10">
          <div className="mb-6 inline-flex rounded-full border border-black px-4 py-1 text-xs uppercase tracking-[0.24em]">
            AIRISLENS
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            {status === "loading" ? "Memverifikasi email..." : "Verifikasi Email"}
          </h1>

          <p
            className={`mt-4 text-sm leading-7 ${
              isSuccess
                ? "text-green-700"
                : status === "invalid" || status === "expired" || status === "error"
                  ? "text-red-600"
                  : "text-black/70"
            }`}
          >
            {message}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={isSuccess ? "/login?verified=1" : "/login"}
              className="rounded-full bg-black px-5 py-3 text-sm text-white transition hover:bg-black/85"
            >
              Ke Halaman Login
            </Link>

            <Link
              href="/"
              className="rounded-full border border-black px-5 py-3 text-sm text-black transition hover:bg-black hover:text-white"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
