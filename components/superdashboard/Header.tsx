"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState<{
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("HEADER USER ERROR:", err);
      }
    };

    fetchUser();
  }, []);

  return (
    <header className="h-16 border-b border-black/20 bg-[#ffffff] backdrop-blur flex items-center justify-between px-6">
      <div>
        <div className="mt-1 text-[24px] text-black">
          Super Admin
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 🔥 NAMA USER DINAMIS */}
        <div className="text-[18px] text-black">
          {user?.name || "Loading..."}
        </div>

        {/* 🔥 AVATAR */}
        <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-sm">
          {user?.name?.charAt(0).toUpperCase() || "?"}
        </div>
      </div>
    </header>
  );
}