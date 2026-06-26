"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GalleryItem = {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
};

type GalleryForm = {
  title: string;
  category: string;
  imageUrl: string;
};

const EMPTY_FORM: GalleryForm = {
  title: "",
  category: "",
  imageUrl: "",
};

export default function AdminGaleriPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<GalleryForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  async function loadItems() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/gallery", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        items?: GalleryItem[];
      };

      if (!response.ok) {
        setItems([]);
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat galeri.");
        return;
      }

      setItems(data.items ?? []);
      setIsError(false);
      setMessage("");
    } catch {
      setItems([]);
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openCreate() {
    setActive(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setPreviewUrl("");
    setOpen(true);
  }

  function openDetail(item: GalleryItem) {
    setActive(item);
    setForm({
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
    });
    setFile(null);
    setPreviewUrl("");
    setOpen(true);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function uploadImageIfNeeded() {
    if (!file) {
      return form.imageUrl;
    }

    const uploadBody = new FormData();
    uploadBody.append("kind", "gallery");
    uploadBody.append("file", file);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: uploadBody,
    });
    const data = (await response.json()) as {
      message?: string;
      url?: string;
    };

    if (!response.ok || !data.url) {
      throw new Error(data.message ?? "Gagal mengunggah foto galeri.");
    }

    return data.url;
  }

  async function submit() {
    if (!form.title || !form.category || (!form.imageUrl && !file)) {
      setIsError(true);
      setMessage("Judul, kategori, dan gambar wajib diisi.");
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage("");

    try {
      const imageUrl = await uploadImageIfNeeded();
      const endpoint = active
        ? `/api/admin/gallery/${active.id}`
        : "/api/admin/gallery";
      const method = active ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          imageUrl,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        item?: GalleryItem;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menyimpan galeri.");
        return;
      }

      if (active) {
        const activeId = active.id;
        const updatedItem: GalleryItem = {
          id: activeId,
          title: form.title,
          category: form.category,
          imageUrl,
        };

        setItems((prev) =>
          prev.map((item) => (item.id === activeId ? updatedItem : item))
        );
      } else if (data.item) {
        const createdItem = data.item;
        setItems((prev) => [createdItem, ...prev]);
      }

      setOpen(false);
      setActive(null);
      setForm(EMPTY_FORM);
      setFile(null);
      setPreviewUrl("");
      setIsError(false);
      setMessage(data.message ?? "Galeri berhasil disimpan.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Tidak dapat terhubung ke server."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus foto ini dari galeri?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/gallery/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menghapus foto galeri.");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setOpen(false);
      setIsError(false);
      setMessage(data.message ?? "Foto galeri berhasil dihapus.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    }
  }

  const resolvedPreview = previewUrl || form.imageUrl;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-normal text-black">Galeri Foto</h1>
          <p className="text-lg font-normal text-black">
            Kelola foto yang tampil di website partner Anda.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2 text-sm text-black hover:opacity-90"
        >
          + Tambah Foto
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
        <div className="py-20 text-center text-black/40">Memuat galeri partner...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]"
            >
              <div className="relative h-56 w-full">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-4">
                <p className="text-[20px] font-medium text-white">{item.title}</p>
                <p className="text-xs text-white/60">{item.category}</p>

                <button
                  onClick={() => openDetail(item)}
                  className="mt-3 rounded-lg border text-white border-white/20 px-6 py-1 text-xs transition hover:bg-white/10"
                >
                  Detail
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="col-span-full text-center text-black/50">
              Belum ada foto di galeri.
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-black/20 bg-white p-6">
            <h2 className="mb-4 text-2xl text-black">
              {active ? "Detail Foto" : "Tambah Foto"}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Judul Foto"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5] px-4 py-2 text-sm text-black"
              />

              <input
                placeholder="Kategori"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5] px-4 py-2 text-sm text-black"
              />

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5] px-4 py-2 text-sm"
              />

              {resolvedPreview && (
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-black/20">
                  <Image src={resolvedPreview} alt="Preview" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              {active && (
                <button
                  onClick={() => remove(active.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Hapus
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-black/20 px-4 py-2 text-sm text-black/70 hover:bg-black/10"
                >
                  Tutup
                </button>

                <button
                  onClick={submit}
                  disabled={isSaving}
                  className="rounded-lg bg-black px-6 py-2 text-sm text-white hover:opacity-90 disabled:opacity-70"
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
