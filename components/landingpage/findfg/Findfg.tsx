"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type FindFgPartner = {
  userId: number;
  slug: string;
  brandName: string;
  category: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  imageUrl: string;
};

export default function FindFg({
  photographers,
  initialCategorySlug,
}: {
  photographers: FindFgPartner[];
  initialCategorySlug?: string | null;
}) {
  const categories = useMemo(() => {
    const entries = new Map<string, string>();

    for (const photographer of photographers) {
      for (const category of photographer.categories) {
        if (category.slug && category.name && !entries.has(category.slug)) {
          entries.set(category.slug, category.name);
        }
      }
    }

    return [
      { slug: "all", name: "All" },
      ...Array.from(entries.entries()).map(([slug, name]) => ({ slug, name })),
    ];
  }, [photographers]);
  const [activeCategory, setActiveCategory] = useState(() => {
    const normalized = initialCategorySlug?.trim().toLowerCase();

    if (normalized && categories.some((item) => item.slug === normalized)) {
      return normalized;
    }

    return "all";
  });

  const filtered =
    activeCategory === "all"
      ? photographers
      : photographers.filter((item) =>
          item.categories.some((category) => category.slug === activeCategory)
        );

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-10 py-10 md:px-20"
    >
      <div className="mb-16 mt-10 flex flex-col items-start justify-between md:flex-row md:items-center">
        <h1 className="text-[40px] font-normal leading-tight text-black">
          Choise Your <br /> Fotographer
        </h1>

        <p className="mt-6 max-w-md text-[24px] leading-relaxed text-black md:mt-0">
          We carefully select and recommend the best photographers to match
          your style, ensuring every moment you capture is nothing less than
          extraordinary.
        </p>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

  {/* LEFT: CATEGORY */}
  <div className="flex flex-wrap gap-4 text-[18px] text-gray-400 md:gap-8">
    {categories.map((category) => (
      <button
        key={category.slug}
        onClick={() => setActiveCategory(category.slug)}
        className={`transition ${
          activeCategory === category.slug
            ? "font-medium text-black"
            : "hover:text-black"
        }`}
      >
        {category.name}
      </button>
    ))}
  </div>

  {/* RIGHT: PARTNERSHIP BUTTON */}
  <Link
    href="/partner"
    className="text-[18px] font-medium text-black hover:opacity-70 transition"
  >
    + Partnership
  </Link>

</div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
        {filtered.map((partner) => (
          <Link
            key={partner.userId}
            href={
              activeCategory !== "all"
                ? `/findfg/${partner.slug}?category=${encodeURIComponent(activeCategory)}`
                : `/findfg/${partner.slug}`
            }
          >
            <div className="relative h-[260px] w-full cursor-pointer overflow-hidden rounded-sm transition hover:scale-[1.02]">
              <Image
                src={partner.imageUrl}
                alt={partner.brandName}
                fill
                className="object-cover"
              />

              <div className="absolute bottom-0 left-0 right-0 bg-black/20 p-3">
                <p className="text-[18px] font-normal text-white md:text-[20px]">
                  {partner.brandName}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/75">
                  {partner.category}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-black/40">
          Belum ada partner yang tampil di kategori ini.
        </div>
      )}
    </section>
  );
}
