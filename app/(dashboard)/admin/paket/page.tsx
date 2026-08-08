"use client";

import { useEffect, useMemo, useState } from "react";

type PartnerCategory = {
  id: number;
  name: string;
  slug: string;
};

type Paket = {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  name: string;
  duration: string;
  price: number;
  description: string;
};

const EMPTY_PACKAGE_FORM = {
  categoryId: "",
  name: "",
  duration: "",
  price: 0,
  description: "",
};

const EMPTY_CATEGORY_FORM = {
  name: "",
};

export default function AdminPaketPage() {
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Paket | null>(null);
  const [editingCategory, setEditingCategory] = useState<PartnerCategory | null>(
    null
  );
  const [packageForm, setPackageForm] = useState(EMPTY_PACKAGE_FORM);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);

  async function loadCatalog() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/packages", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        categories?: PartnerCategory[];
        packages?: Paket[];
      };

      if (!response.ok) {
        setCategories([]);
        setPakets([]);
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat katalog layanan.");
        return;
      }

      setCategories(data.categories ?? []);
      setPakets(data.packages ?? []);
      setIsError(false);
      setMessage("");
    } catch {
      setCategories([]);
      setPakets([]);
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  const packageCountByCategory = useMemo(() => {
    const counts = new Map<number, number>();

    for (const paket of pakets) {
      if (!paket.categoryId) {
        continue;
      }

      counts.set(paket.categoryId, (counts.get(paket.categoryId) ?? 0) + 1);
    }

    return counts;
  }, [pakets]);
  const uncategorizedPackages = useMemo(
    () => pakets.filter((item) => !item.categoryId),
    [pakets]
  );

  function resetPackageForm() {
    setPackageForm(EMPTY_PACKAGE_FORM);
    setEditingPackage(null);
  }

  function resetCategoryForm() {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setEditingCategory(null);
  }

  function openCreateCategory() {
    resetCategoryForm();
    setCategoryOpen(true);
  }

  function openEditCategory(category: PartnerCategory) {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
    });
    setCategoryOpen(true);
  }

  function openCreatePackage(categoryId?: number) {
    if (categories.length === 0) {
      setIsError(true);
      setMessage("Tambahkan kategori layanan terlebih dahulu sebelum membuat paket.");
      return;
    }

    resetPackageForm();
    setPackageForm((current) => ({
      ...current,
      categoryId: String(categoryId ?? categories[0]?.id ?? ""),
    }));
    setPackageOpen(true);
  }

  function openEditPackage(paket: Paket) {
    setEditingPackage(paket);
    setPackageForm({
      categoryId: paket.categoryId ? String(paket.categoryId) : "",
      name: paket.name,
      duration: paket.duration,
      price: paket.price,
      description: paket.description,
    });
    setPackageOpen(true);
  }

  async function submitCategory() {
    if (!categoryForm.name.trim()) {
      setIsError(true);
      setMessage("Nama kategori wajib diisi.");
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage("");

    try {
      const endpoint = editingCategory
        ? `/api/admin/package-categories/${editingCategory.id}`
        : "/api/admin/package-categories";
      const method = editingCategory ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menyimpan kategori.");
        return;
      }

      await loadCatalog();
      setCategoryOpen(false);
      resetCategoryForm();
      setIsError(false);
      setMessage(data.message ?? "Kategori berhasil disimpan.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCategory(id: number) {
    if (!confirm("Hapus kategori ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/package-categories/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menghapus kategori.");
        return;
      }

      await loadCatalog();
      setCategoryOpen(false);
      resetCategoryForm();
      setIsError(false);
      setMessage(data.message ?? "Kategori berhasil dihapus.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    }
  }

  async function submitPackage() {
    const categoryId = Number(packageForm.categoryId);

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      !packageForm.name.trim() ||
      !packageForm.duration.trim() ||
      packageForm.price <= 0
    ) {
      setIsError(true);
      setMessage("Kategori, nama, durasi, dan harga paket wajib diisi.");
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage("");

    try {
      const endpoint = editingPackage
        ? `/api/admin/packages/${editingPackage.id}`
        : "/api/admin/packages";
      const method = editingPackage ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          name: packageForm.name,
          duration: packageForm.duration,
          price: packageForm.price,
          description: packageForm.description,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menyimpan paket.");
        return;
      }

      await loadCatalog();
      setPackageOpen(false);
      resetPackageForm();
      setIsError(false);
      setMessage(data.message ?? "Paket berhasil disimpan.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removePackage(id: number) {
    if (!confirm("Hapus paket ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menghapus paket.");
        return;
      }

      await loadCatalog();
      setPackageOpen(false);
      resetPackageForm();
      setIsError(false);
      setMessage(data.message ?? "Paket berhasil dihapus.");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[40px] font-normal text-black">Paket dan Kategori</h1>
          <p className="text-lg font-normal text-black">
            Kelola kategori layanan dan paket fotografi tanpa mencampur semua
            paket dalam satu daftar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openCreateCategory}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black transition hover:border-black"
          >
            + Tambah Kategori
          </button>
          <button
            onClick={() => openCreatePackage()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-normal text-black hover:opacity-90"
          >
            + Tambah Paket
          </button>
        </div>
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

      <section className="rounded-2xl border border-black/20 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl text-black">Kategori Layanan</h2>
            <p className="mt-1 text-sm text-black/60">
              Setiap kategori akan menjadi tab/chip di halaman detail fotografer
              dan form booking.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-black/40">Memuat kategori...</div>
        ) : categories.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-[#faf7f2] px-6 py-10 text-center text-black/50">
            Belum ada kategori layanan. Tambahkan kategori seperti Wedding,
            Prewedding, atau Graduation terlebih dahulu.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-black/10 bg-[#fcfcfc] p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                  {category.slug}
                </p>
                <h3 className="mt-2 text-xl text-black">{category.name}</h3>
                <p className="mt-2 text-sm text-black/60">
                  {packageCountByCategory.get(category.id) ?? 0} paket
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEditCategory(category)}
                    className="rounded-lg border border-black/10 px-3 py-2 text-xs text-black transition hover:border-black"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openCreatePackage(category.id)}
                    className="rounded-lg bg-black px-3 py-2 text-xs text-white transition hover:bg-black/85"
                  >
                    + Paket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {uncategorizedPackages.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          Masih ada {uncategorizedPackages.length} paket tanpa kategori. Buka
          detail paket tersebut lalu sambungkan ke kategori yang sesuai.
        </section>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-black/40">Memuat paket partner...</div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPackages = pakets.filter(
              (paket) => paket.categoryId === category.id
            );

            return (
              <section
                key={category.id}
                className="overflow-hidden rounded-2xl border border-black/20 bg-white"
              >
                <div className="flex flex-col gap-3 border-b border-black/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                      Kategori
                    </p>
                    <h2 className="mt-1 text-2xl text-black">{category.name}</h2>
                    <p className="mt-1 text-sm text-black/60">
                      {categoryPackages.length} paket layanan
                    </p>
                  </div>
                  <button
                    onClick={() => openCreatePackage(category.id)}
                    className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-black transition hover:border-black"
                  >
                    + Tambah Paket
                  </button>
                </div>

                {categoryPackages.length === 0 ? (
                  <div className="px-6 py-10 text-center text-black/45">
                    Belum ada paket pada kategori ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-black">
                      <thead className="bg-white text-black">
                        <tr>
                          <th className="px-6 py-4 text-left font-medium">Nama</th>
                          <th className="px-6 py-4 font-medium">Durasi</th>
                          <th className="px-6 py-4 font-medium">Harga</th>
                          <th className="px-6 py-4 text-left font-medium">
                            Deskripsi
                          </th>
                          <th className="px-6 py-4 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPackages.map((paket) => (
                          <tr
                            key={paket.id}
                            className="border-t border-black/10 transition hover:bg-black/[0.02]"
                          >
                            <td className="px-6 py-4 text-left">{paket.name}</td>
                            <td className="px-6 py-4 text-center">{paket.duration}</td>
                            <td className="px-6 py-4 text-center">
                              Rp {paket.price.toLocaleString("id-ID")}
                            </td>
                            <td className="px-6 py-4 text-left text-black/75">
                              {paket.description || "-"}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => openEditPackage(paket)}
                                className="rounded-lg border border-black/20 px-3 py-1 text-xs transition hover:bg-black/10"
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {packageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-black/20 bg-[#f5f5f5f5] p-6">
            <h2 className="mb-4 text-lg font-medium text-black">
              {editingPackage ? "Edit Paket" : "Tambah Paket"}
            </h2>

            <div className="space-y-4">
              <select
                value={packageForm.categoryId}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              >
                <option value="">Pilih kategori layanan</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Nama Paket"
                value={packageForm.name}
                onChange={(event) =>
                  setPackageForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <input
                placeholder="Durasi (contoh: 60 menit)"
                value={packageForm.duration}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    duration: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <input
                type="number"
                placeholder="Harga"
                value={packageForm.price}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    price: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <textarea
                placeholder="Deskripsi"
                value={packageForm.description}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-[90px] w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />
            </div>

            <div className="mt-6 flex justify-between">
              {editingPackage && (
                <button
                  onClick={() => void removePackage(editingPackage.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Hapus
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setPackageOpen(false)}
                  className="rounded-lg border bg-black px-4 py-2 text-sm text-white hover:bg-black/10"
                >
                  Batal
                </button>
                <button
                  onClick={() => void submitPackage()}
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

      {categoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-black/20 bg-[#f5f5f5f5] p-6">
            <h2 className="mb-4 text-lg font-medium text-black">
              {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Nama kategori, contoh: Wedding"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm({ name: event.target.value })
                }
                className="w-full rounded-xl border border-black/20 bg-[#f5f5f5f5] px-4 py-2 text-sm text-black outline-none"
              />

              <p className="text-sm text-black/55">
                Slug akan dibuat otomatis dari nama kategori.
              </p>
            </div>

            <div className="mt-6 flex justify-between">
              {editingCategory && (
                <button
                  onClick={() => void removeCategory(editingCategory.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Hapus
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCategoryOpen(false)}
                  className="rounded-lg border bg-black px-4 py-2 text-sm text-white hover:bg-black/10"
                >
                  Batal
                </button>
                <button
                  onClick={() => void submitCategory()}
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
