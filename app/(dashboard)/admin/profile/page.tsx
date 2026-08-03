"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { shouldBypassImageOptimization } from "@/lib/uploaded-assets";

type ProfileForm = {
  accountEmail: string;
  brandName: string;
  slug: string;
  description: string;
  specializations: string[];
  address: string;
  whatsapp: string;
  latitude: string;
  longitude: string;
  freeDistanceKm: string;
  flatTransportFee: string;
  partnerType: "individual" | "studio";
  teamQuota: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profilePhotoUrl: string;
};

type ProfileApiResponse = {
  accountEmail?: string;
  brandName?: string;
  slug?: string;
  description?: string;
  specializations?: string[];
  address?: string;
  whatsapp?: string;
  latitude?: number | null;
  longitude?: number | null;
  freeDistanceKm?: number | null;
  flatTransportFee?: number | null;
  partnerType?: "individual" | "studio";
  teamQuota?: number | null;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
  profilePhotoUrl?: string;
};

type SubmitState = "idle" | "uploading" | "saving";

const SPECIALIZATION_OPTIONS = [
  "Prewedding & Wedding",
  "Portrait & Personal Branding",
  "Event Documentation",
  "Fashion & Editorial",
  "Graduation",
  "Product",
];

const EMPTY_FORM: ProfileForm = {
  accountEmail: "",
  brandName: "",
  slug: "",
  description: "",
  specializations: [],
  address: "",
  whatsapp: "",
  latitude: "",
  longitude: "",
  freeDistanceKm: "5",
  flatTransportFee: "0",
  partnerType: "individual",
  teamQuota: "1",
  instagram: "",
  tiktok: "",
  facebook: "",
  website: "",
  profilePhotoUrl: "",
};

function normalizeProfileForm(profile?: ProfileApiResponse | null): ProfileForm {
  return {
    accountEmail: profile?.accountEmail ?? "",
    brandName: profile?.brandName ?? "",
    slug: profile?.slug ?? "",
    description: profile?.description ?? "",
    specializations: Array.isArray(profile?.specializations)
      ? profile.specializations
      : [],
    address: profile?.address ?? "",
    whatsapp: profile?.whatsapp ?? "",
    latitude:
      profile?.latitude === null || profile?.latitude === undefined
        ? ""
        : String(profile.latitude),
    longitude:
      profile?.longitude === null || profile?.longitude === undefined
        ? ""
        : String(profile.longitude),
    freeDistanceKm:
      profile?.freeDistanceKm === null || profile?.freeDistanceKm === undefined
        ? "5"
        : String(profile.freeDistanceKm),
    flatTransportFee:
      profile?.flatTransportFee === null || profile?.flatTransportFee === undefined
        ? "0"
        : String(profile.flatTransportFee),
    partnerType: profile?.partnerType === "studio" ? "studio" : "individual",
    teamQuota:
      profile?.teamQuota === null || profile?.teamQuota === undefined
        ? "1"
        : String(profile.teamQuota),
    instagram: profile?.instagram ?? "",
    tiktok: profile?.tiktok ?? "",
    facebook: profile?.facebook ?? "",
    website: profile?.website ?? "",
    profilePhotoUrl: profile?.profilePhotoUrl ?? "",
  };
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const isSubmitting = submitState !== "idle";
  const submitLabel =
    submitState === "uploading"
      ? "Mengunggah Foto..."
      : submitState === "saving"
        ? "Menyimpan Profil..."
        : "Simpan Profile";
  const submitStatusText =
    submitState === "uploading"
      ? "Mengunggah, mengubah ke WebP, dan mengompres foto..."
      : submitState === "saving"
        ? "Menyimpan profil partner..."
        : "";

  async function loadProfile() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/profile", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        profile?: ProfileApiResponse;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal memuat profil partner.");
        return;
      }

      setForm(normalizeProfileForm(data.profile));
      setIsError(false);
      setMessage("");
    } catch {
      setIsError(true);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function handleChange(field: keyof ProfileForm, value: string | string[]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handlePartnerTypeChange(value: "individual" | "studio") {
    setForm((prev) => ({
      ...prev,
      partnerType: value,
      teamQuota: value === "individual" ? "1" : prev.teamQuota || "1",
    }));
  }

  function handleCheckbox(value: string) {
    setForm((prev) => {
      const exists = prev.specializations.includes(value);

      return {
        ...prev,
        specializations: exists
          ? prev.specializations.filter((item) => item !== value)
          : [...prev.specializations, value],
      };
    });
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (photoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoFile(selected);
    setPhotoPreviewUrl(URL.createObjectURL(selected));
  }

  async function uploadPhotoIfNeeded() {
    if (!photoFile) {
      return form.profilePhotoUrl;
    }

    const uploadBody = new FormData();
    uploadBody.append("kind", "profile");
    uploadBody.append("file", photoFile);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: uploadBody,
    });
    const data = (await response.json()) as {
      message?: string;
      url?: string;
    };

    if (!response.ok || !data.url) {
      throw new Error(data.message ?? "Gagal mengunggah photo profile.");
    }

    return data.url;
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setSubmitState(photoFile ? "uploading" : "saving");
    setIsError(false);
    setMessage("");

    try {
      const profilePhotoUrl = await uploadPhotoIfNeeded();
      setSubmitState("saving");
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brandName: form.brandName,
          description: form.description,
          specializations: form.specializations,
          address: form.address,
          whatsapp: form.whatsapp,
          latitude: form.latitude,
          longitude: form.longitude,
          freeDistanceKm: form.freeDistanceKm,
          flatTransportFee: form.flatTransportFee,
          partnerType: form.partnerType,
          teamQuota: form.partnerType === "individual" ? "1" : form.teamQuota,
          instagram: form.instagram,
          tiktok: form.tiktok,
          facebook: form.facebook,
          website: form.website,
          profilePhotoUrl,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        profile?: ProfileApiResponse;
      };

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message ?? "Gagal menyimpan profil partner.");
        return;
      }

      setForm(
        normalizeProfileForm(data.profile ?? null)
      );
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      setIsError(false);
      setMessage(data.message ?? "Profil partner berhasil disimpan.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Tidak dapat terhubung ke server."
      );
    } finally {
      setSubmitState("idle");
    }
  }

  const previewImage = useMemo(() => {
    return photoPreviewUrl || form.profilePhotoUrl || "/svg/fg1.svg";
  }, [form.profilePhotoUrl, photoPreviewUrl]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] text-black">Profile Settings</h1>
        <p className="text-lg text-black">
          Lengkapi profil partner agar otomatis tampil di halaman FindFG.
        </p>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6 rounded-[28px] border border-black/10 bg-white p-6">
          {isLoading ? (
            <div className="py-20 text-center text-black/40">Memuat profil partner...</div>
          ) : (
            <>
              <div>
                <label className="text-sm text-black">Nama Brand</label>
                <input
                  value={form.brandName}
                  onChange={(event) => handleChange("brandName", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-black">Deskripsi</label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-black">Spesialisasi</label>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {SPECIALIZATION_OPTIONS.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.specializations.includes(item)}
                        onChange={() => handleCheckbox(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-black">Alamat</label>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-black">Latitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={form.latitude}
                    onChange={(event) => handleChange("latitude", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                    placeholder="-6.20000000"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">Longitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={form.longitude}
                    onChange={(event) => handleChange("longitude", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                    placeholder="106.81666600"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">Jarak Gratis Transport (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.freeDistanceKm}
                    onChange={(event) =>
                      handleChange("freeDistanceKm", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">
                    Biaya Transport Jika Melebihi Batas
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.flatTransportFee}
                    onChange={(event) =>
                      handleChange("flatTransportFee", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                    placeholder="75000"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-black">Tipe Partner</label>
                  <div className="mt-2 grid gap-3 grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handlePartnerTypeChange("individual")}
                      className={`rounded-xl border px-4 py-3 text-sm transition ${
                        form.partnerType === "individual"
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black hover:border-black"
                      }`}
                    >
                      Perorangan
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerTypeChange("studio")}
                      className={`rounded-xl border px-4 py-3 text-sm transition ${
                        form.partnerType === "studio"
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black hover:border-black"
                      }`}
                    >
                      Studio
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-black">Kuota Tim per Slot</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.teamQuota}
                    disabled={form.partnerType === "individual"}
                    onChange={(event) => handleChange("teamQuota", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/45"
                  />
                  <p className="mt-2 text-xs text-black/50">
                    {form.partnerType === "individual"
                      ? "Partner perorangan selalu memakai kuota 1 slot."
                      : "Jumlah maksimum booking aktif pada jam yang sama."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-black">No. WhatsApp</label>
                  <input
                    value={form.whatsapp}
                    onChange={(event) => handleChange("whatsapp", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">Instagram</label>
                  <input
                    value={form.instagram}
                    onChange={(event) => handleChange("instagram", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                    placeholder="@namabrand"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">TikTok</label>
                  <input
                    value={form.tiktok}
                    onChange={(event) => handleChange("tiktok", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-black">Facebook</label>
                  <input
                    value={form.facebook}
                    onChange={(event) => handleChange("facebook", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-black">Website</label>
                  <input
                    value={form.website}
                    onChange={(event) => handleChange("website", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
                    placeholder="https://"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-black py-3 text-sm text-white hover:opacity-90 disabled:opacity-70"
              >
                {submitLabel}
              </button>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-black/10 bg-white p-5">
            <div className="relative mb-4 h-[360px] overflow-hidden rounded-[24px] bg-[#f2f2f2]">
              <Image
                src={previewImage}
                alt={form.brandName || "Partner Photo"}
                fill
                unoptimized={shouldBypassImageOptimization(previewImage)}
                className="object-cover"
              />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-black">Photo Profile</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm"
              />
              <span className="mt-2 block text-xs text-black/50">
                Foto otomatis dikonversi ke WebP dan dikompres sebelum disimpan.
              </span>
              {photoFile && (
                <span className="mt-1 block text-xs text-black/60">
                  File dipilih: <span className="font-medium">{photoFile.name}</span>
                </span>
              )}
            </label>
            {submitStatusText && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                <span>{submitStatusText}</span>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-black/10 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-black/40">Preview</p>
            <h2 className="mt-3 text-2xl text-black">
              {form.brandName || "Nama brand partner"}
            </h2>
            <p className="mt-2 text-sm text-black/60">
              {form.accountEmail || "email-partner@airislens.com"}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {form.specializations.length > 0 ? (
                form.specializations.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-black/5 px-3 py-1 text-xs text-black"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-black/40">
                  Belum ada spesialisasi dipilih.
                </span>
              )}
            </div>

            <div className="mt-6 space-y-4 text-sm text-black/70">
              <div>
                <p className="text-black/40">Public URL</p>
                <p>{form.slug ? `/findfg/${form.slug}` : "Slug akan dibuat otomatis."}</p>
              </div>
              <div>
                <p className="text-black/40">WhatsApp</p>
                <p>{form.whatsapp || "Belum diisi"}</p>
              </div>
              <div>
                <p className="text-black/40">Tipe Partner</p>
                <p>{form.partnerType === "studio" ? "Studio" : "Perorangan"}</p>
              </div>
              <div>
                <p className="text-black/40">Kuota Tim</p>
                <p>{form.teamQuota || "1"} slot</p>
              </div>
              <div>
                <p className="text-black/40">Alamat</p>
                <p>{form.address || "Belum diisi"}</p>
              </div>
              <div>
                <p className="text-black/40">Koordinat</p>
                <p>
                  {form.latitude && form.longitude
                    ? `${form.latitude}, ${form.longitude}`
                    : "Belum diisi"}
                </p>
              </div>
              <div>
                <p className="text-black/40">Transport</p>
                <p>
                  Gratis {Number(form.freeDistanceKm || 0).toLocaleString("id-ID", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  km | Rp{" "}
                  {Number(form.flatTransportFee || 0).toLocaleString("id-ID")} jika
                  melewati batas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
