"use client";

import Image from "next/image";

// ✅ DUMMY DATA IMAGE
const galleryData = [
  { id: 1, image: "/images/4.JPG", name: "Beranjak Photo", category: "Wedding" },
  { id: 2, image: "/images/2.JPG", name: "Swaraphoto Studio", category: "Prewedding" },
  { id: 3, image: "/images/3.JPG", name: "Agata Photo", category: "Event" },
  { id: 4, image: "/images/4.JPG", name: "Mono Capture", category: "Product" },
  { id: 5, image: "/images/5.JPG", name: "Gradia Studio", category: "Graduation" },
  { id: 6, image: "/images/6.JPG", name: "Velour Visual", category: "Wedding" },
  { id: 7, image: "/images/7.JPG", name: "Noir Studio", category: "Event" },
  { id: 8, image: "/images/8.JPG", name: "Aura Shot", category: "Prewedding" },
  { id: 9, image: "/images/9.JPG", name: "Beranjak Photo", category: "Wedding" },
  { id: 10, image: "/images/8.JPG", name: "Agata Photo", category: "Event" },
  { id: 11, image: "/images/5.JPG", name: "Mono Capture", category: "Product" },
  { id: 12, image: "/images/2.JPG", name: "Velour Visual", category: "Wedding" },
];

export default function Gallery() {
  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-10 md:px-20 py-10"
    >
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 mt-10">
        <h1 className="text-black text-[24px] md:text-[40px] font-normal leading-tight">
          Explore Our <br /> Gallery
        </h1>

        <p className="max-w-md text-black mt-6 md:mt-0 text-[18px] md:text-[24px] leading-relaxed">
          Discover stunning moments captured by our photographers. Each frame
          tells a story, crafted with creativity, precision, and emotion.
        </p>
      </div>

      {/* ================= GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {galleryData.map((item) => (
          <div
            key={item.id}
            className="relative w-full h-[260px] rounded-sm overflow-hidden group cursor-pointer"
          >
            {/* IMAGE */}
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
            />

            {/* OVERLAY */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-4">
              <div className="text-white text-[18px]">
                <p className="font-normal">{item.name}</p>
                <p className="text-[16px] opacity-80">{item.category}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
