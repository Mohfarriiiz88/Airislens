"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";

import {
  EMPTY_GALLERY_DECLARATIONS,
  GALLERY_DECLARATION_ERROR_MESSAGE,
  GALLERY_UPLOAD_DECLARATIONS,
  galleryDeclarationsAccepted,
  type GalleryDeclarationPayload,
} from "@/lib/gallery-declarations";
import { shouldBypassImageOptimization } from "@/lib/uploaded-assets";

type GalleryDeclarationAudit = {
  declarationAcceptedAt: string | null;
  ownershipDeclared: boolean;
  publicationConsentDeclared: boolean;
  responsibilityAccepted: boolean;
  subjectConsentDeclared: boolean;
};

type GalleryItem = {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
} & GalleryDeclarationAudit;

type GalleryForm = {
  title: string;
  category: string;
  imageUrl: string;
};

type SubmitState = "idle" | "uploading" | "saving";

const EMPTY_FORM: GalleryForm = {
  title: "",
  category: "",
  imageUrl: "",
};

function createEmptyDeclarations(): GalleryDeclarationPayload {
  return { ...EMPTY_GALLERY_DECLARATIONS };
}

function formatDeclarationAcceptedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminGaleriPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<GalleryForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [declarations, setDeclarations] = useState<GalleryDeclarationPayload>(
    createEmptyDeclarations()
  );
  const isSubmitting = submitState !== "idle";
  const hasSelectedNewFile = Boolean(file);
  const requiresDeclarations = !active || hasSelectedNewFile;
  const declarationsComplete = galleryDeclarationsAccepted(declarations);
  const hasRequiredFields =
    form.title.trim().length > 0 &&
    form.category.trim().length > 0 &&
    (form.imageUrl.trim().length > 0 || hasSelectedNewFile);
  const isSubmitDisabled =
    isSubmitting ||
    !hasRequiredFields ||
    (requiresDeclarations && !declarationsComplete);
  const submitLabel =
    submitState === "uploading"
      ? "Mengunggah Foto..."
      : submitState === "saving"
        ? active
          ? "Menyimpan Perubahan..."
          : "Menyimpan..."
        : active
          ? "Simpan Perubahan"
          : "Upload Foto";
  const submitStatusText =
    submitState === "uploading"
      ? "Mengunggah, mengubah ke WebP, dan mengompres foto..."
      : submitState === "saving"
        ? "Menyimpan data galeri..."
        : "";

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

  function closeModal() {
    setOpen(false);
    setActive(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setPreviewUrl("");
    setDeclarations(createEmptyDeclarations());
  }

  function openCreate() {
    closeModal();
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
    setDeclarations(createEmptyDeclarations());
    setOpen(true);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDeclarations(createEmptyDeclarations());
  }

  function handleDeclarationChange(key: keyof GalleryDeclarationPayload) {
    setDeclarations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function uploadImageIfNeeded() {
    if (!file) {
      return form.imageUrl.trim();
    }

    const uploadBody = new FormData();
    uploadBody.append("kind", "gallery");
    uploadBody.append("file", file);

    for (const declaration of GALLERY_UPLOAD_DECLARATIONS) {
      uploadBody.append(declaration.key, String(declarations[declaration.key]));
    }

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
    if (isSubmitDisabled) {
      if (requiresDeclarations && !declarationsComplete) {
        setIsError(true);
        setMessage(GALLERY_DECLARATION_ERROR_MESSAGE);
      } else {
        setIsError(true);
        setMessage("Judul, kategori, dan gambar wajib diisi.");
      }

      return;
    }

    setSubmitState(file ? "uploading" : "saving");
    setIsError(false);
    setMessage("");

    try {
      const title = form.title.trim();
      const category = form.category.trim();
      const imageUrl = await uploadImageIfNeeded();
      setSubmitState("saving");

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
          title,
          category,
          imageUrl,
          ...declarations,
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
        const updatedItem =
          data.item ??
          ({
            ...active,
            title,
            category,
            imageUrl,
          } satisfies GalleryItem);

        setItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
      } else if (data.item) {
        setItems((prev) => [data.item as GalleryItem, ...prev]);
      }

      closeModal();
      setIsError(false);
      setMessage(
        data.message ??
          (active
            ? "Foto galeri berhasil diperbarui."
            : "Foto berhasil ditambahkan ke galeri.")
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Tidak dapat terhubung ke server."
      );
    } finally {
      setSubmitState("idle");
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
      closeModal();
      setIsError(false);
      setMessage(data.message ?? "Foto galeri berhasil dihapus.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    }
  }

  const resolvedPreview = previewUrl || form.imageUrl;
  const storedDeclarationTimestamp =
    active && !hasSelectedNewFile
      ? formatDeclarationAcceptedAt(active.declarationAcceptedAt)
      : null;

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
        <div className="py-20 text-center text-black/40">
          Memuat galeri partner...
        </div>
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
                  unoptimized={shouldBypassImageOptimization(item.imageUrl)}
                  className="object-cover"
                />
              </div>

              <div className="p-4">
                <p className="text-[20px] font-medium text-white">{item.title}</p>
                <p className="text-xs text-white/60">{item.category}</p>

                <button
                  onClick={() => openDetail(item)}
                  className="mt-3 rounded-lg border border-white/20 px-6 py-1 text-xs text-white transition hover:bg-white/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/20 bg-white p-6">
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
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5] px-4 py-2 text-sm"
              />
              <p className="text-xs text-black/50">
                Foto otomatis dikonversi ke WebP dan dikompres sebelum disimpan.
              </p>
              {file && (
                <p className="text-xs text-black/60">
                  File dipilih: <span className="font-medium">{file.name}</span>
                </p>
              )}

              {resolvedPreview && (
                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-black/20">
                  <Image
                    src={resolvedPreview}
                    alt="Preview"
                    fill
                    unoptimized={shouldBypassImageOptimization(resolvedPreview)}
                    className="object-cover"
                  />
                  {submitStatusText && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-4">
                      <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-black shadow-sm">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        <span>{submitStatusText}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-black/10 bg-[#faf7f2] p-4">
                <div className="space-y-2">
                  <h3 className="text-base font-medium text-black">
                    Pernyataan dan Persetujuan Publikasi
                  </h3>
                  <p className="text-xs leading-6 text-black/65">
                    Dengan menyetujui pernyataan di bawah ini, deklarasi berlaku
                    untuk seluruh foto yang Anda pilih dalam proses unggah ini.
                  </p>
                  <p className="text-xs leading-6 text-black/55">
                    {requiresDeclarations
                      ? "Seluruh checkbox wajib dicentang sebelum foto dapat diunggah atau file pengganti disimpan."
                      : "File foto tidak berubah, sehingga deklarasi yang sudah tersimpan tetap digunakan."}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {GALLERY_UPLOAD_DECLARATIONS.map((item) => {
                    const checked = requiresDeclarations
                      ? declarations[item.key]
                      : Boolean(active?.[item.key]);

                    return (
                      <label
                        key={item.key}
                        className={`flex gap-3 rounded-xl border px-4 py-3 ${
                          checked
                            ? "border-black/15 bg-white"
                            : "border-black/10 bg-white/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleDeclarationChange(item.key)}
                          disabled={!requiresDeclarations || isSubmitting}
                          className="mt-1 h-4 w-4 rounded border-black/30 accent-black disabled:cursor-not-allowed"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-black">
                            {item.label}
                          </p>
                          <p className="text-xs leading-6 text-black/65">
                            {item.statement}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {requiresDeclarations ? (
                  <p
                    className={`mt-4 text-xs ${
                      declarationsComplete ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {declarationsComplete
                      ? "Seluruh pernyataan telah disetujui. Upload foto dapat dilanjutkan."
                      : "Centang seluruh pernyataan untuk mengaktifkan tombol upload foto."}
                  </p>
                ) : (
                  <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-xs text-black/65">
                    <p className="font-medium text-black">Status deklarasi tersimpan</p>
                    <p className="mt-1 leading-6">
                      {active?.declarationAcceptedAt
                        ? storedDeclarationTimestamp
                          ? `Fotografer telah memberikan pernyataan dan persetujuan untuk file ini pada ${storedDeclarationTimestamp}.`
                          : "Fotografer telah memberikan pernyataan dan persetujuan untuk file ini."
                        : "Belum ada deklarasi tersimpan untuk foto ini. Jika file diganti, seluruh pernyataan wajib disetujui kembali."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              {active ? (
                <button
                  onClick={() => remove(active.id)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hapus
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-black/20 px-4 py-2 text-sm text-black/70 hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tutup
                </button>

                <button
                  onClick={submit}
                  disabled={isSubmitDisabled}
                  className="rounded-lg bg-black px-6 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-black/40 disabled:text-white/80 disabled:hover:opacity-100"
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
