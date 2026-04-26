"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
}

export default function Gallery() {
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/gallery");

        if (!response.ok) {
          throw new Error("Gagal mengambil data galeri");
        }

        const data = await response.json();
        setGalleryData(data.items || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan saat loading"
        );
        setGalleryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

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

      {/* ================= LOADING STATE ================= */}
      {loading && (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-black text-[18px]">Memuat galeri...</div>
        </div>
      )}

      {/* ================= ERROR STATE ================= */}
      {error && !loading && (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-red-500 text-[18px]">{error}</div>
        </div>
      )}

      {/* ================= GRID ================= */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {galleryData.length > 0 ? (
            galleryData.map((item) => (
              <div
                key={item.id}
                className="relative w-full h-[260px] rounded-sm overflow-hidden group cursor-pointer"
              >
                {/* IMAGE */}
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-4">
                  <div className="text-white text-[18px]">
                    <p className="font-normal">{item.title}</p>
                    <p className="text-[16px] opacity-80">{item.category}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-black text-[18px]">
              Tidak ada foto di galeri
            </div>
          )}
        </div>
      )}
    </section>
  );
}
