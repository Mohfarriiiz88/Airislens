"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Package,
  Image,
  ClipboardList,
  User,
  Wallet,
} from "lucide-react";
import { LogOut,ExternalLink  } from "lucide-react";

const menu = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Booking", href: "/admin/bookinglist", icon: ClipboardList },
  { label: "Jadwal", href: "/admin/calender", icon: CalendarDays },
  { label: "Paket", href: "/admin/paket", icon: Package },
  { label: "Galeri", href: "/admin/galeri", icon: Image },
  { label: "Keuangan", href: "/admin/finance", icon: Wallet },
  { label: "Profile", href: "/admin/profile", icon: User },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside
      className={`
        ${collapsed ? "w-[90px]" : "w-[240px]"}
        bg-white border-r border-black/20 py-6
        transition-all duration-300
      `}
    >
      {/* ================= HEADER ================= */}
      <div
        className={`
          mb-10 px-4 cursor-pointer
          ${collapsed ? "flex justify-center" : "flex justify-start"}
        `}
        onClick={() => setCollapsed(!collapsed)}
      >
        <NextImage
          src={collapsed ? "/svg/logogram.svg" : "/svg/logotype.svg"}
          alt="logo"
          width={128}
          height={32}
          className={`${collapsed ? "w-8" : "w-32"}`}
        />
      </div>

      {/* ================= MENU ================= */}
      <nav className="space-y-2 px-2">
        {menu.map((m) => {
          const Icon = m.icon;
          const isActive = pathname === m.href;

          return (
            <Link
              key={m.href}
              href={m.href}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl
                text-[16px] transition-all
                ${
                  isActive
                    ? "bg-black text-white"
                    : "text-black hover:bg-black/10"
                }
                ${collapsed ? "justify-center" : ""}
              `}
            >
              {/* ICON */}
              <div className="w-[24px] flex justify-center items-center">
                <Icon size={20} strokeWidth={1.5} />
              </div>

              {/* TEXT */}
              {!collapsed && <span>{m.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pt-10 space-y-2">

  {/* ===== BACK TO WEBSITE ===== */}
  <Link
    href="/"
    className={`
      w-full flex items-center gap-3 px-3 py-3 mt-40 rounded-xl
      text-[16px] text-black
      hover:bg-black hover:text-white
      transition-all
      ${collapsed ? "justify-center" : ""}
    `}
  >
    <div className="w-[24px] flex justify-center items-center">
      <ExternalLink size={20} strokeWidth={1.5} />
    </div>

    {!collapsed && <span>Back to Website</span>}
  </Link>

  {/* ===== LOGOUT ===== */}
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-3 rounded-xl
      text-[16px] text-black
      hover:bg-red-500 hover:text-white
      transition-all
      ${collapsed ? "justify-center" : ""}
    `}
    onClick={handleLogout}
  >
    <div className="w-[24px] flex justify-center items-center">
      <LogOut size={20} strokeWidth={1.5} />
    </div>

    {!collapsed && <span>Logout</span>}
  </button>

</div>
    </aside>
    
  );
}
