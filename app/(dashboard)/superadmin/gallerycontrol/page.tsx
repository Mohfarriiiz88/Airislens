'use client'

import { useState } from 'react'

type GalleryControl= {
  id: string
  image: string
  title: string
  partner: string
  category: string
}

const INITIAL_DATA: GalleryControl[] = [
  {
    id: 'GL-001',
    image: 'https://source.unsplash.com/random/400x300?wedding',
    title: 'Wedding Moment',
    partner: 'Beranjak Photo',
    category: 'Wedding',
  },
  {
    id: 'GL-002',
    image: 'https://source.unsplash.com/random/400x300?couple',
    title: 'Couple Session',
    partner: 'Lens Studio',
    category: 'Prewedding',
  },
  {
    id: 'GL-003',
    image: 'https://source.unsplash.com/random/400x300?graduation',
    title: 'Graduation',
    partner: 'Studio Lens',
    category: 'Graduation',
  },
]

export default function SuperadminGalleryPage() {
  const [gallery, setGallery] = useState(INITIAL_DATA)

  function handleDelete(id: string) {
    if (!confirm('Hapus foto ini?')) return

    setGallery((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-8">

      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-[40px] text-black">
          Gallery Management
        </h1>
        <p className="text-lg text-black">
          Kelola seluruh galeri fotografer
        </p>
      </div>

      {/* ===== GRID ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {gallery.map((item) => (
          <div
            key={item.id}
            className="relative rounded-2xl overflow-hidden border border-black/20 group"
          >
            {/* IMAGE */}
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-52 object-cover"
            />

            {/* OVERLAY */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-4">

              {/* DELETE BUTTON */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 text-white text-xs px-3 py-1 rounded-lg"
                >
                  Hapus
                </button>
              </div>

              {/* INFO */}
              <div className="text-white">
                <div className="text-sm font-medium">
                  {item.title}
                </div>
                <div className="text-xs text-white/80">
                  {item.partner}
                </div>
              </div>

            </div>

            {/* FOOTER INFO */}
            <div className="p-3">
              <div className="text-sm font-medium text-black">
                {item.title}
              </div>
              <div className="text-xs text-black/50">
                {item.category}
              </div>
            </div>

          </div>
        ))}

      </div>

      {/* EMPTY STATE */}
      {gallery.length === 0 && (
        <div className="text-center text-black/40 py-10">
          Tidak ada foto
        </div>
      )}
    </div>
  )
}