"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Image,
  ClipboardList,
} from "lucide-react";
import { LogOut } from "lucide-react";

const menu = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Booking", href: "/admin/bookinglist", icon: ClipboardList },
  { label: "Paket", href: "/admin/paket", icon: Package },
  { label: "Galeri", href: "/admin/galeri", icon: Image },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

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
        <img
          src={collapsed ? "/svg/logogram.svg" : "/svg/logotype.svg"}
          alt="logo"
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
      <div className="absolute bottom-20 p-4">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-[16px] transition-all hover:bg-black/10"
        >
          <LogOut size={20} strokeWidth={1.5} />
          {!collapsed && <span>Logout</span>}
        </Link>
      </div>
    </aside>
    
  );
}