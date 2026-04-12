"use client";

export default function Gallery() {
  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-10 md:px-20 py-10"
    >

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 mt-10">
        
        {/* LEFT */}
        <h1 className="text-[24px] md:text-[40px] font-medium leading-tight">
          Explore Our <br /> Gallery
        </h1>

        {/* RIGHT */}
        <p className="max-w-md text-black mt-6 md:mt-0 text-[18px] md:text-[24px] leading-relaxed">
          Discover stunning moments captured by our photographers. Each frame
          tells a story, crafted with creativity, precision, and emotion.
        </p>
      </div>

     

      {/* ================= GRID GALLERY ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="relative w-full h-[260px] bg-gray-300 rounded-sm overflow-hidden group cursor-pointer"
          >
            {/* Overlay hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-4">
              <div className="text-white text-sm">
                <p className="font-medium">Photographer Name</p>
                <p className="text-xs opacity-80">Wedding</p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
