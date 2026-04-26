    "use client";

    import { useState } from "react";
    import Link from "next/link";
    import Image from "next/image";
    

    const categories = [
      "All",
      "Wedding",
      "Prewedding",
      "Event",
      "Product",
      "Graduation",
    ];

    // ✅ DUMMY DATA (SCALABLE)
    const photographers = [
      { id: 1, name: "Beranjak Photo", category: "Wedding", slug: "beranjak-photo", image: "/svg/fg1.svg" },
      { id: 2, name: "Swaraphoto Studio", category: "Prewedding", slug: "swaraphoto-studio", image: "/svg/fg2.svg" },
      { id: 3, name: "Agata Photo", category: "Event", slug: "agata-photo", image: "/svg/fg3.svg" },
      { id: 4, name: "Mono Capture", category: "Product", slug: "mono-capture", image: "/svg/fg4.svg" },
      { id: 5, name: "Gradia Studio", category: "Graduation", slug: "gradia-studio", image: "/svg/fg4.svg" },
      { id: 6, name: "Velour Visual", category: "Wedding", slug: "velour-visual", image: "/svg/fg3.svg" },
      { id: 7, name: "Noir Studio", category: "Event", slug: "noir-studio", image: "/svg/fg2.svg" },
      { id: 8, name: "Aura Shot", category: "Prewedding", slug: "aura-shot", image: "/svg/fg1.svg" },
    ];

    export default function FindFg() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? photographers
      : photographers.filter((fg) => fg.category === activeCategory);

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-10 md:px-20 py-10"
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 mt-10">
        <h1 className="text-black text-[40px] font-normal leading-tight">
          Choise Your <br /> Fotographer
        </h1>

        <p className="max-w-md text-black mt-6 md:mt-0 text-[24px] leading-relaxed">
          We carefully select and recommend the best photographers to match
          your style, ensuring every moment you capture is nothing less than
          extraordinary.
        </p>
      </div>

      {/* CATEGORY */}
      <div className="flex gap-8 mb-10 text-gray-400 text-[18px]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`transition ${
              activeCategory === cat
                ? "text-black font-medium"
                : "hover:text-black"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {filtered.map((fg) => (
          <Link key={fg.id} href={`/findfg/${fg.slug}`}>
            <div className="relative w-full h-[260px] rounded-sm overflow-hidden cursor-pointer hover:scale-[1.02] transition">
              
              {/* IMAGE */}
              <Image
                src={fg.image}
                alt={fg.name}
                fill
                className="object-cover"
              />

              {/* OVERLAY TEXT */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/20">
                <p className="text-white text-[18px] md:text-[20px] font-normal">
                  {fg.name}
                </p>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
