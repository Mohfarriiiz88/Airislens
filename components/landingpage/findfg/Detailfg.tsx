"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import BookingGateLink from "@/components/ui/BookingGateLink";

type PartnerGalleryItem = {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
};

type PartnerCategory = {
  id: number;
  name: string;
  slug: string;
};

type PartnerPackage = {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  name: string;
  duration: string;
  price: number;
  description: string;
};

type PartnerDetail = {
  userId: number;
  slug: string;
  brandName: string;
  description: string;
  specializations: string[];
  address: string;
  freeDistanceKm: number;
  flatTransportFee: number;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  website: string;
  profilePhotoUrl: string;
  gallery: PartnerGalleryItem[];
  categories: PartnerCategory[];
  packages: PartnerPackage[];
};

function normalizeWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDistanceKm(distanceKm: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(distanceKm);
}

function buildBookingHref(input: {
  photographerId: number;
  categoryId?: number | null;
  packageId?: number | null;
}) {
  const searchParams = new URLSearchParams({
    photographerId: String(input.photographerId),
  });

  if (input.categoryId) {
    searchParams.set("categoryId", String(input.categoryId));
  }

  if (input.packageId) {
    searchParams.set("packageId", String(input.packageId));
  }

  return `/bookingform?${searchParams.toString()}`;
}

export default function DetailFg({
  partner,
  isAuthenticated,
  initialCategorySlug,
}: {
  partner: PartnerDetail;
  isAuthenticated: boolean;
  initialCategorySlug?: string | null;
}) {
  const heroImage =
    partner.profilePhotoUrl || partner.gallery[0]?.imageUrl || "/svg/fg1.svg";
  const portfolioImages =
    partner.gallery.length > 0
      ? partner.gallery.slice(0, 3)
      : [
          {
            id: 1,
            title: "Preview 1",
            category: "Portfolio",
            imageUrl: "/images/2.JPG",
          },
          {
            id: 2,
            title: "Preview 2",
            category: "Portfolio",
            imageUrl: "/images/3.JPG",
          },
          {
            id: 3,
            title: "Preview 3",
            category: "Portfolio",
            imageUrl: "/images/4.JPG",
          },
        ];
  const whatsappUrl = normalizeWhatsappUrl(partner.whatsapp);
  const bookingMessage = `Untuk melanjutkan booking dengan ${partner.brandName}, silakan login terlebih dahulu. Setelah login, Anda akan langsung diarahkan ke form booking.`;

  const defaultCategory = useMemo(() => {
    if (partner.categories.length === 0) {
      return null;
    }

    const normalizedSlug = initialCategorySlug?.trim().toLowerCase();

    if (normalizedSlug) {
      const matchedCategory = partner.categories.find(
        (item) => item.slug.toLowerCase() === normalizedSlug
      );

      if (matchedCategory) {
        return matchedCategory;
      }
    }

    return partner.categories[0];
  }, [initialCategorySlug, partner.categories]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
    defaultCategory?.id ?? null
  );

  const activeCategory = useMemo(() => {
    if (partner.categories.length === 0) {
      return null;
    }

    return (
      partner.categories.find((item) => item.id === activeCategoryId) ??
      defaultCategory
    );
  }, [activeCategoryId, defaultCategory, partner.categories]);
  const visiblePackages = useMemo(() => {
    if (!activeCategory) {
      return partner.packages;
    }

    return partner.packages.filter((item) => item.categoryId === activeCategory.id);
  }, [activeCategory, partner.packages]);
  const bookingHref = buildBookingHref({
    photographerId: partner.userId,
    categoryId: activeCategory?.id ?? null,
  });
  const loginHref = `/login?next=${encodeURIComponent(bookingHref)}`;

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 py-10 font-[NeueHaas] md:px-20"
    >
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative mb-4 h-[400px] w-full overflow-hidden rounded-[24px] bg-[#f3f3f3]">
            <Image
              src={heroImage}
              alt={partner.brandName}
              fill
              className="object-cover"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {portfolioImages.map((item) => (
              <div
                key={item.id}
                className="relative h-[200px] w-full overflow-hidden rounded-2xl"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-start">
          <h1 className="mb-4 text-[24px] font-normal text-black md:text-[40px]">
            {partner.brandName}
          </h1>

          <p className="mb-6 text-[20px] leading-relaxed text-black">
            {partner.description || "Partner ini belum menambahkan deskripsi profil."}
          </p>

          <div className="mb-6">
            <p className="mb-2 text-[20px] font-normal text-black">Specializations</p>
            <ul className="space-y-1 text-[20px] text-black">
              {partner.specializations.length > 0 ? (
                partner.specializations.map((item) => <li key={item}>- {item}</li>)
              ) : (
                <li>- Belum ada spesialisasi</li>
              )}
            </ul>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-[20px] font-normal text-black">Location</p>
            <p className="text-[20px] text-black">
              {partner.address || "Alamat partner belum diisi."}
            </p>
          </div>

          <div className="mb-6 rounded-3xl border border-black/10 bg-[#faf7f2] px-5 py-4">
            <p className="mb-2 text-[20px] font-normal text-black">
              Aturan Transportasi
            </p>
            <div className="space-y-2 text-[18px] text-black/75">
              <p>
                Gratis transportasi sampai{" "}
                {formatDistanceKm(partner.freeDistanceKm)} km.
              </p>
              <p>
                {partner.flatTransportFee > 0
                  ? `Di atas ${formatDistanceKm(partner.freeDistanceKm)} km dikenakan biaya transportasi ${formatCurrency(partner.flatTransportFee)}.`
                  : `Di atas ${formatDistanceKm(partner.freeDistanceKm)} km tidak dikenakan biaya transportasi tambahan.`}
              </p>
            </div>
          </div>

          <div className="mb-6 grid gap-3 text-sm text-black/70 md:grid-cols-2">
            {partner.instagram && <p>Instagram: {partner.instagram}</p>}
            {partner.tiktok && <p>TikTok: {partner.tiktok}</p>}
            {partner.facebook && <p>Facebook: {partner.facebook}</p>}
            {partner.website && <p>Website: {partner.website}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <BookingGateLink
              href={bookingHref}
              loginHref={loginHref}
              isAuthenticated={isAuthenticated}
              modalDescription={bookingMessage}
              className="inline-flex rounded-md bg-black px-10 py-2 text-[18px] text-white"
            >
              Booking
            </BookingGateLink>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                className="inline-flex items-center rounded-md bg-black px-10 py-2 text-[18px] text-white"
              >
                Whatsapp Us
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20 grid items-start gap-12 md:grid-cols-2">
        <h2 className="text-[40px] font-normal text-black">
          Service <br /> Packages
        </h2>

        <p className="text-[20px] text-black">
          Pilih kategori layanan terlebih dahulu, lalu sistem hanya akan
          menampilkan paket yang sesuai dengan kategori aktif.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        <div>
          <p className="mb-3 text-[18px] text-black">Pilih Kategori Layanan</p>

          {partner.categories.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {partner.categories.map((category) => {
                const active = activeCategory?.id === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white text-black hover:border-black"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm text-black/60">
              Partner ini belum memiliki kategori layanan aktif.
            </p>
          )}
        </div>

        {activeCategory ? (
          <div className="rounded-3xl border border-black/10 bg-[#fafafa] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">
              Kategori aktif
            </p>
            <p className="mt-2 text-[22px] text-black">{activeCategory.name}</p>
          </div>
        ) : null}

        {visiblePackages.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-3">
            {visiblePackages.map((item) => {
              const packageBookingHref = buildBookingHref({
                photographerId: partner.userId,
                categoryId: item.categoryId ?? activeCategory?.id ?? null,
                packageId: item.id,
              });

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-black/45">
                    {item.categoryName || activeCategory?.name || "General"}
                  </p>
                  <h3 className="mb-2 text-[20px] font-normal text-black">
                    {item.name}
                  </h3>
                  <p className="mb-1 text-xl font-normal text-black">
                    IDR {item.price.toLocaleString("id-ID")}
                  </p>
                  <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
                    {item.duration}
                  </p>
                  <p className="mb-6 text-[20px] text-black">
                    {item.description || "Deskripsi paket belum diisi."}
                  </p>

                  <BookingGateLink
                    href={packageBookingHref}
                    loginHref={`/login?next=${encodeURIComponent(packageBookingHref)}`}
                    isAuthenticated={isAuthenticated}
                    modalDescription={`Silakan login terlebih dahulu untuk memilih paket ${item.name} dan melanjutkan booking dengan ${partner.brandName}.`}
                    className="block w-full rounded-md bg-black py-2 text-center text-[18px] text-white"
                  >
                    Pilih Paket
                  </BookingGateLink>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-black/15 bg-[#fcfcfc] px-6 py-16 text-center text-black/45">
            {activeCategory
              ? `Belum ada paket pada kategori ${activeCategory.name}.`
              : "Partner ini belum menambahkan paket layanan."}
          </div>
        )}
      </div>
    </section>
  );
}
