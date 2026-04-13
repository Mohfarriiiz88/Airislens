"use client";

import { useState } from "react";

const categories = [
  "All",
  "Wedding",
  "Prewedding",
  "Event",
  "Product",
  "Graduation",
];

export default function FindFg() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-10 md:px-20 py-10"
    >
      
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 mt-10">
        
        {/* LEFT */}
        <h1 className="text-black text-[40px] md:text-[40px] font-medium leading-tight">
          Choise Your <br /> Fotographer
        </h1>

        {/* RIGHT */}
        <p className="max-w-md text-black mt-6 md:mt-0 text-[24px] leading-relaxed">
          We carefully select and recommend the best photographers to match
          your style, ensuring every moment you capture is nothing less than
          extraordinary.
        </p>
      </div>

      <div className="flex gap-8 mb-10 text-gray-400 text-sm">
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

      {/* ================= GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-full h-[260px] bg-gray-300 rounded-sm animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
