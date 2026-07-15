"use client";

import Link from "next/link";
import { useState } from "react";

import LoginRequiredModal from "@/components/ui/LoginRequiredModal";

type BookingGateLinkProps = {
  href: string;
  loginHref: string;
  isAuthenticated: boolean;
  className: string;
  children: React.ReactNode;
  modalDescription: string;
  modalTitle?: string;
};

export default function BookingGateLink({
  href,
  loginHref,
  isAuthenticated,
  className,
  children,
  modalDescription,
  modalTitle,
}: BookingGateLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isAuthenticated) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {children}
      </button>

      <LoginRequiredModal
        open={isModalOpen}
        loginHref={loginHref}
        title={modalTitle}
        description={modalDescription}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
