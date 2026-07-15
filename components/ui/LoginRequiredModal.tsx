"use client";

import Link from "next/link";
import { X } from "lucide-react";

type LoginRequiredModalProps = {
  open: boolean;
  loginHref: string;
  description: string;
  onClose: () => void;
  title?: string;
};

export default function LoginRequiredModal({
  open,
  loginHref,
  description,
  onClose,
  title = "Login Required.",
}: LoginRequiredModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        className="relative w-full max-w-md rounded-[28px] bg-white p-8 text-black shadow-[0_30px_80px_rgba(0,0,0,0.22)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup popup login"
          className="absolute right-4 top-4 rounded-full border border-black/10 p-2 text-black/70 transition hover:border-black hover:text-black"
        >
          <X size={18} />
        </button>

        <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
          Booking AIRISLENS
        </p>

        <h2 id="login-required-title" className="mt-3 text-[26px] leading-tight">
          {title}
        </h2>

        <p className="mt-4 text-[16px] text-black">
          {description}
        </p>

        <Link
          href={loginHref}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-[16px] text-white transition hover:bg-black/85"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
