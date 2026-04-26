"use client";

import { useEffect, useState } from "react";

type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
  createdAt: string;
};

export default function PartnerPage() {
  const [search, setSearch] = useState("");
  const [partners, setPartners] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  async function loadPartners() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/superadmin/users", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        users?: ManagedUser[];
      };

      if (!response.ok) {
        setPartners([]);
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat data partner.");
        return;
      }

      setPartners((data.users ?? []).filter((user) => user.role === "admin"));
      setIsError(false);
      setMessage("");
    } catch {
      setPartners([]);
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  async function handleDemote(partner: ManagedUser) {
    setPendingUserId(partner.id);
    setIsError(false);
    setMessage("");

    try {
      const response = await fetch(`/api/superadmin/users/${partner.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "user" }),
      });
      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menurunkan partner.");
        return;
      }

      setPartners((prev) => prev.filter((item) => item.id !== partner.id));
      setIsError(false);
      setMessage(data.message ?? "Partner berhasil diturunkan menjadi client.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setPendingUserId(null);
    }
  }

  const filteredPartners = partners.filter((partner) => {
    const query = search.toLowerCase();
    return (
      partner.name.toLowerCase().includes(query) ||
      partner.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] text-black">Partner Management</h1>
        <p className="text-lg text-black">
          Akun dengan role admin ditampilkan di sini sebagai partner atau fotografer.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Cari nama atau email partner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-black/20 px-4 py-2 text-sm md:w-80"
        />

        <button
          onClick={loadPartners}
          className="rounded-xl border border-black/20 bg-white px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-500/20 bg-red-500/10 text-red-600"
              : "border-green-500/20 bg-green-500/10 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/20 bg-white">
        <table className="w-full text-sm text-center text-black">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Terdaftar</th>
              <th className="px-6 py-4 font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-6 text-black/40">
                  Memuat data partner...
                </td>
              </tr>
            ) : filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-black/40">
                  Tidak ada partner.
                </td>
              </tr>
            ) : (
              filteredPartners.map((partner) => {
                const isPending = pendingUserId === partner.id;

                return (
                  <tr key={partner.id} className="border-t border-black/20">
                    <td className="px-6 py-4 text-left font-medium">{partner.name}</td>
                    <td className="px-6 py-4">{partner.email}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-600">
                        Partner
                      </span>
                    </td>
                    <td className="px-6 py-4">{formatDate(partner.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDemote(partner)}
                        disabled={isPending}
                        className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs text-yellow-700 transition hover:bg-yellow-500/30 disabled:opacity-60"
                      >
                        {isPending ? "Memproses..." : "Turunkan ke Client"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
