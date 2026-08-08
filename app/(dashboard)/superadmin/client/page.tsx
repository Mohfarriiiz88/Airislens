"use client";

import { useEffect, useState } from "react";

type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
  createdAt: string;
};

export default function ClientPage() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  async function loadClients() {
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
        setClients([]);
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat data klien.");
        return;
      }

      setClients((data.users ?? []).filter((user) => user.role === "user"));
      setIsError(false);
      setMessage("");
    } catch {
      setClients([]);
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handlePromote(client: ManagedUser) {
    setPendingUserId(client.id);
    setIsError(false);
    setMessage("");

    try {
      const response = await fetch(`/api/superadmin/users/${client.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "admin" }),
      });
      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal mengangkat klien menjadi mitra.");
        return;
      }

      setClients((prev) => prev.filter((item) => item.id !== client.id));
      setIsError(false);
      setMessage(data.message ?? "Klien berhasil diangkat menjadi mitra.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setPendingUserId(null);
    }
  }

  const filteredClients = clients.filter((client) => {
    const query = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] font-normal text-black">Manajemen Klien</h1>
        <p className="text-lg text-black">
          Kelola akun klien dan angkat klien menjadi mitra dari halaman ini.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Cari nama atau email klien..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-black/20 bg-white px-4 py-2 text-sm text-black outline-none md:w-80"
        />

        <button
          onClick={loadClients}
          className="rounded-xl border border-black/20 bg-white px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white"
        >
          Muat Ulang
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
        <table className="w-full text-left text-sm text-black">
          <thead className="text-center">
            <tr>
              <th className="px-6 py-4 text-left font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Terdaftar</th>
              <th className="px-6 py-4 font-medium">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-black/40">
                  Memuat data klien...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-black/40">
                  Tidak ada klien yang cocok.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const isPending = pendingUserId === client.id;

                return (
                  <tr
                    key={client.id}
                    className="border-t border-black/20 text-center transition hover:bg-black/[0.03]"
                  >
                    <td className="px-6 py-4 text-left">{client.name}</td>
                    <td className="px-6 py-4">{client.email}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                        Klien
                      </span>
                    </td>
                    <td className="px-6 py-4">{formatDate(client.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handlePromote(client)}
                        disabled={isPending}
                        className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-500/30 disabled:opacity-60"
                      >
                        {isPending ? "Memproses..." : "Jadikan Mitra"}
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
