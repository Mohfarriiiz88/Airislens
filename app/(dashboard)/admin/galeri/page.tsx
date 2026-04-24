'use client'

import { useState } from 'react'
import Image from 'next/image'

type GalleryItem = {
  id: string
  title: string
  category: string
  imageUrl: string
}

export default function AdminGaleriPage() {
  const [items, setItems] = useState<GalleryItem[]>([
    {
      id: 'GL-001',
      title: 'Portrait Session',
      category: 'Portrait',
      imageUrl: '/images/heroPotrait.JPG',
    },
    {
      id: 'GL-002',
      title: 'Couple Session',
      category: 'Couple',
      imageUrl: '/images/heroCouple.JPG',
    },
  ])

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<GalleryItem | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: '',
    imageUrl: '',
  })

  const openCreate = () => {
    setForm({ title: '', category: '', imageUrl: '' })
    setActive(null)
    setOpen(true)
  }

  const openDetail = (item: GalleryItem) => {
    setActive(item)
    setForm({
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
    })
    setOpen(true)
  }

  const submit = () => {
    if (!form.title || !form.imageUrl) {
      alert('Judul dan gambar wajib diisi')
      return
    }

    if (active) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === active.id ? { ...i, ...form } : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `GL-${Date.now()}`,
          ...form,
        },
      ])
    }

    setOpen(false)
  }

  const remove = (id: string) => {
    if (!confirm('Hapus foto ini dari galeri?')) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setOpen(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Galeri Foto</h1>
          <p className="text-sm text-white/60">
            Kelola foto yang tampil di website Beranjak Photo
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          + Tambah Foto
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]"
          >
            <div className="relative h-56 w-full">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover"
              />
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-white">
                {item.title}
              </p>
              <p className="text-xs text-white/60">
                {item.category}
              </p>

              <button
                onClick={() => openDetail(item)}
                className="mt-3 rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10 transition"
              >
                Detail
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full text-center text-white/50">
            Belum ada foto di galeri
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-[#111111] p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">
              {active ? 'Detail Foto' : 'Tambah Foto'}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Judul Foto"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              <input
                placeholder="Kategori (Portrait / Couple / dll)"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              <input
                placeholder="URL Gambar"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              {form.imageUrl && (
                <div className="relative h-40 w-full rounded-xl overflow-hidden border border-white/10">
                  <Image
                    src={form.imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              {active && (
                <button
                  onClick={() => remove(active.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Hapus Foto
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                >
                  Tutup
                </button>
                <button
                  onClick={submit}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}