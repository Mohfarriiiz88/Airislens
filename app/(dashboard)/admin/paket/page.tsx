"use client";

import { useEffect, useState } from "react";

type Paket = {
  id: number;
  name: string;
  duration: string;
  price: number;
  description: string;
};

const EMPTY_FORM = {
  name: "",
  duration: "",
  price: 0,
  description: "",
};

export default function AdminPaketPage() {
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Paket | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadPackages() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/packages", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        packages?: Paket[];
      };

      if (!response.ok) {
        setPakets([]);
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat paket.");
        return;
      }

      setPakets(data.packages ?? []);
      setIsError(false);
      setMessage("");
    } catch {
      setPakets([]);
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(paket: Paket) {
    setEditing(paket);
    setForm({
      name: paket.name,
      duration: paket.duration,
      price: paket.price,
      description: paket.description,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name || !form.duration || !form.price) {
      setIsError(true);
      setMessage("Nama, durasi, dan harga paket wajib diisi.");
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage("");

    try {
      const endpoint = editing
        ? `/api/admin/packages/${editing.id}`
        : "/api/admin/packages";
      const method = editing ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        message?: string;
        package?: Paket;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menyimpan paket.");
        return;
      }

      if (editing) {
        setPakets((prev) =>
          prev.map((item) => (item.id === editing.id ? { ...editing, ...form } : item))
        );
      } else if (data.package) {
        setPakets((prev) => [data.package, ...prev]);
      }

      setOpen(false);
      resetForm();
      setIsError(false);
      setMessage(data.message ?? "Paket berhasil disimpan.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus paket ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menghapus paket.");
        return;
      }

      setPakets((prev) => prev.filter((item) => item.id !== id));
      setOpen(false);
      setIsError(false);
      setMessage(data.message ?? "Paket berhasil dihapus.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-normal text-black">Photo Package</h1>
          <p className="text-lg font-normal text-black">
            Kelola paket layanan fotografi untuk halaman detail partner.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2 text-sm font-normal text-black hover:opacity-90"
        >
          + Tambah Paket
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

      {isLoading ? (
        <div className="py-20 text-center text-black/40">Memuat paket partner...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/20 bg-[#ffffff]">
          <table className="w-full text-sm text-black">
            <thead className="bg-[#ffffff] text-black">
              <tr>
                <th className="px-6 py-4 text-left font-medium">Nama</th>
                <th className="px-6 py-4 font-medium">Durasi</th>
                <th className="px-6 py-4 font-medium">Harga</th>
                <th className="px-6 py-4 font-medium">Deskripsi</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pakets.map((paket) => (
                <tr
                  key={paket.id}
                  className="border-t border-black/20 transition hover:bg-white/10"
                >
                  <td className="px-6 py-4 text-left">{paket.name}</td>
                  <td className="px-6 py-4 text-center">{paket.duration}</td>
                  <td className="px-6 py-4 text-center">
                    Rp {paket.price.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-center text-black">
                    {paket.description}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEdit(paket)}
                      className="rounded-lg border border-black/20 px-3 py-1 text-xs transition hover:bg-black/10"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}

              {pakets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-black/50">
                    Belum ada paket.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-black/20 bg-[#f5f5f5f5] p-6">
            <h2 className="mb-4 text-lg font-medium text-black">
              {editing ? "Edit Paket" : "Tambah Paket"}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Nama Paket"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <input
                placeholder="Durasi (contoh: 60 menit)"
                value={form.duration}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, duration: event.target.value }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <input
                type="number"
                placeholder="Harga"
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: Number(event.target.value) }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <textarea
                placeholder="Deskripsi"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="min-h-[90px] w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />
            </div>

            <div className="mt-6 flex justify-between">
              {editing && (
                <button
                  onClick={() => remove(editing.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Hapus
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border bg-black px-4 py-2 text-sm text-white hover:bg-black/10"
                >
                  Batal
                </button>
                <button
                  onClick={submit}
                  disabled={isSaving}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-70"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
