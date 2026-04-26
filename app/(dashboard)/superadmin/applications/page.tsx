'use client'

import { useEffect, useState } from 'react'

type Application = {
  id: string
  name: string
  email: string
  phone: string
  studioName: string
  address: string
  specialization: string
  portfolio: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

const INITIAL_DATA: Application[] = [
  {
    id: 'APP-001',
    name: 'Andi Pratama',
    email: 'andi@mail.com',
    phone: '081234567890',
    studioName: 'Beranjak Photo',
    address: 'Semarang',
    specialization: 'Wedding',
    portfolio: 'instagram.com/beranjakphoto',
    status: 'Pending',
    createdAt: '20 Mar 2026',
  },
  {
    id: 'APP-002',
    name: 'Siti Aisyah',
    email: 'siti@mail.com',
    phone: '082345678901',
    studioName: 'Lens Studio',
    address: 'Jakarta',
    specialization: 'Prewedding',
    portfolio: 'instagram.com/lensstudio',
    status: 'Approved',
    createdAt: '18 Mar 2026',
  },
]

export default function ApplicationsPage() {
  const [data, setData] = useState(INITIAL_DATA)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // 🔥 close dropdown ketika klik luar
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenu(null)
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const filtered = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleApprove(id: string) {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Approved' } : item
      )
    )
  }

  function handleReject(id: string) {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Rejected' } : item
      )
    )
  }

  return (
    <div className="space-y-8">

      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-[40px] text-black">
          Partner Applications
        </h1>
        <p className="text-lg text-black">
          Kelola pengajuan mitra fotografer
        </p>
      </div>

      {/* ===== SEARCH ===== */}
      <input
        type="text"
        placeholder="Cari nama..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-72 rounded-xl border border-black/20 px-4 py-2 text-sm"
      />

      {/* ===== TABLE ===== */}
      <div className="rounded-2xl border border-black/20 bg-white overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead>
            <tr>
              <th className="text-left px-6 py-4">Nama</th>
              <th className="px-6 py-4">Studio</th>
              <th className="px-6 py-4">Spesialisasi</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-black/20">
                <td className="text-left px-6 py-4">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-black/50">
                      {item.email}
                    </div>
                  </div>
                </td>

                <td>{item.studioName}</td>
                <td>{item.specialization}</td>
                <td>{item.createdAt}</td>

                <td>
                  <StatusBadge status={item.status} />
                </td>

                {/* ===== DROPDOWN ACTION ===== */}
                <td className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenu(openMenu === item.id ? null : item.id)
                    }}
                    className="px-2 py-1 rounded-lg hover:bg-black/10"
                  >
                    ⋮
                  </button>

                  {openMenu === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-4 mt-2 w-36 bg-white border border-black/20 rounded-xl shadow-lg z-20"
                    >
                      {/* DETAIL */}
                      <button
                        onClick={() => {
                          setSelected(item)
                          setOpenMenu(null)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
                      >
                        Detail
                      </button>

                      {/* APPROVE */}
                      {item.status === 'Pending' && (
                        <button
                          onClick={() => {
                            handleApprove(item.id)
                            setOpenMenu(null)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                        >
                          Approve
                        </button>
                      )}

                      {/* REJECT */}
                      {item.status === 'Pending' && (
                        <button
                          onClick={() => {
                            handleReject(item.id)
                            setOpenMenu(null)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-black/40">
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MODAL DETAIL ===== */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-[400px] space-y-4"
          >
            <h2 className="text-lg font-medium">
              Detail Pengajuan
            </h2>

            <div className="text-sm space-y-2">
              <p><b>Nama:</b> {selected.name}</p>
              <p><b>Email:</b> {selected.email}</p>
              <p><b>Phone:</b> {selected.phone}</p>
              <p><b>Studio:</b> {selected.studioName}</p>
              <p><b>Alamat:</b> {selected.address}</p>
              <p><b>Spesialisasi:</b> {selected.specialization}</p>
              <p><b>Portfolio:</b> {selected.portfolio}</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1 text-sm bg-black/10 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= BADGE ================= */

function StatusBadge({
  status,
}: {
  status: Application['status']
}) {
  const styles = {
    Pending: 'bg-yellow-500/20 text-yellow-500',
    Approved: 'bg-green-500/20 text-green-600',
    Rejected: 'bg-red-500/20 text-red-500',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs ${styles[status]}`}>
      {status}
    </span>
  )
}