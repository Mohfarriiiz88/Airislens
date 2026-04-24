'use client'

import { useState } from 'react'

type Paket = {
  id: string
  name: string
  duration: string
  price: number
  description: string
}

export default function AdminPaketPage() {
  const [pakets, setPakets] = useState<Paket[]>([
    {
      id: 'PK-001',
      name: 'Portrait',
      duration: '60 menit',
      price: 250000,
      description: 'Personal branding / graduation',
    },
    {
      id: 'PK-002',
      name: 'Couple',
      duration: '90 menit',
      price: 350000,
      description: 'Prewedding / couple session',
    },
  ])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Paket | null>(null)

  const [form, setForm] = useState<Omit<Paket, 'id'>>({
    name: '',
    duration: '',
    price: 0,
    description: '',
  })

  const resetForm = () => {
    setForm({ name: '', duration: '', price: 0, description: '' })
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (paket: Paket) => {
    setEditing(paket)
    setForm({
      name: paket.name,
      duration: paket.duration,
      price: paket.price,
      description: paket.description,
    })
    setOpen(true)
  }

  const submit = () => {
    if (!form.name || !form.duration || !form.price) return alert('Form belum lengkap')

    if (editing) {
      setPakets((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, ...form } : p
        )
      )
    } else {
      setPakets((prev) => [
        ...prev,
        { id: `PK-${Date.now()}`, ...form },
      ])
    }

    setOpen(false)
    resetForm()
  }

  const remove = (id: string) => {
    if (!confirm('Hapus paket ini?')) return
    setPakets((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Paket Foto</h1>
          <p className="text-sm text-white/60">
            Kelola paket layanan fotografi
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          + Tambah Paket
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A1A1A] text-white/70">
            <tr>
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Durasi</th>
              <th className="px-6 py-4">Harga</th>
              <th className="px-6 py-4">Deskripsi</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {pakets.map((p) => (
              <tr
                key={p.id}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4 font-medium">{p.name}</td>
                <td className="px-6 py-4">{p.duration}</td>
                <td className="px-6 py-4">
                  Rp {p.price.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 text-white/70">
                  {p.description}
                </td>
               <td className="px-6 py-4">
  <button
    onClick={() => openEdit(p)}
    className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10 transition"
  >
    Detail
  </button>
</td>
              </tr>
            ))}

            {pakets.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-white/50"
                >
                  Belum ada paket
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-[#111111] p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editing ? 'Edit Paket' : 'Tambah Paket'}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Nama Paket"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              <input
                placeholder="Durasi (contoh: 60 menit)"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              <input
                type="number"
                placeholder="Harga"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: +e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />

              <textarea
                placeholder="Deskripsi"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full min-h-[90px] rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Batal
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
      )}
    </div>
  )
}