"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Airis", href: "/airis" },
  { name: "FindFG", href: "/findfg" },
  { name: "Gallery", href: "/gallery" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <div className="flex items-center justify-between px-6 md:px-8 py-5">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="/svg/logo.svg"
            alt="AirisLens Logo"
            width={50}
            height={10}
            className="object-contain"
            priority
          />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-10 text-[20px] font-normal">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`transition ${
                  isActive
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* HAMBURGER BUTTON (FIXED) */}
        <button
          className="md:hidden flex flex-col gap-1.5 relative z-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="w-6 h-[2px] bg-white" />
          <span className="w-6 h-[2px] bg-white" />
          <span className="w-6 h-[2px] bg-white" />
        </button>
      </div>

      {/* MOBILE MENU (FIXED) */}
      <div
        onClick={() => setIsOpen(false)}
        className={`md:hidden fixed top-0 left-0 w-full h-screen z-40 bg-white/20 backdrop-blur-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* MENU CONTENT */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-8 text-xl"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`transition ${
                  isActive
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}