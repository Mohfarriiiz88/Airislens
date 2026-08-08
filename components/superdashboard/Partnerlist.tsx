"use client";

import { useEffect, useState } from "react";

type Partner = {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
};

export default function PartnerList() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await fetch("/api/superadmin/users", {
          cache: "no-store",
        });

        if (!response.ok) {
          setPartners([]);
          return;
        }

        const data = (await response.json()) as {
          users?: Partner[];
        };

        setPartners((data.users ?? []).filter((user) => user.role === "admin").slice(0, 5));
      } catch {
        setPartners([]);
      }
    };

    fetchPartners();
  }, []);

  return (
    <div className="rounded-2xl border border-black/20 bg-white p-5">
      <div className="mb-4 text-18px font-medium">Mitra Fotografer</div>

      <div className="space-y-3">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="flex items-center justify-between border-b border-black/10 pb-2"
          >
            <div>
              <div className="text-sm font-medium text-black">{partner.name}</div>
              <div className="text-xs text-black/50">{partner.email}</div>
            </div>

            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-600">
              Mitra
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
