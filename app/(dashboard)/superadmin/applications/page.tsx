'use client'

import { useEffect, useRef, useState } from 'react'

type Application = {
  id: number
  name: string
  email: string
  phone: string
  location: string
  category: string
  experience: string
  portfolioLink: string
  aboutYou: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export default function ApplicationsPage() {
  const [data, setData] = useState<Application[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // 🔥 ref untuk dropdown
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Fetch data on mount
  useEffect(() => {
    fetchApplications()
  }, [])

  // 🔥 click outside FIX
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function fetchApplications() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/partner-applications')

      if (!response.ok) {
        throw new Error('Gagal mengambil data pengajuan')
      }

      const result = await response.json()
      const applications = result.applications.map((app: any) => ({
        id: app.id,
        name: app.name,
        email: app.email,
        phone: app.phone,
        location: app.location,
        category: app.category,
        experience: app.experience,
        portfolioLink: app.portfolioLink,
        aboutYou: app.aboutYou,
        status: app.status,
        createdAt: new Date(app.createdAt).toLocaleDateString('id-ID'),
      }))

      setData(applications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleApprove(id: number) {
    try {
      setActionLoading(id)
      const response = await fetch(`/api/superadmin/partner-applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Gagal menerima pengajuan')
      }

      // Update local state
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'approved' } : item
        )
      )

      setOpenMenu(null)
      alert('Pengajuan berhasil diterima')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: number) {
    try {
      setActionLoading(id)
      const response = await fetch(`/api/superadmin/partner-applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Gagal menolak pengajuan')
      }

      // Update local state
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'rejected' } : item
        )
      )

      setOpenMenu(null)
      alert('Pengajuan berhasil ditolak')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setActionLoading(null)
    }
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

      {/* ===== ERROR ===== */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ===== LOADING ===== */}
      {loading ? (
        <div className="text-center py-8 text-black/50">
          Memuat data...
        </div>
      ) : (
        <>
          {/* ===== SEARCH ===== */}
          <input
            type="text"
            placeholder="Cari nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-72 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />

          {/* ===== TABLE ===== */}
          <div className="rounded-2xl border border-black/20 bg-white">
            <table className="w-full text-sm text-center">
              <thead>
                <tr>
                  <th className="text-left px-6 py-4">Nama</th>
                  <th className="px-6 py-4">Lokasi</th>
                  <th className="px-6 py-4">Kategori</th>
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

                    <td>{item.location}</td>
                    <td>{item.category}</td>
                    <td>{item.createdAt}</td>

                    <td>
                      <StatusBadge status={item.status} />
                    </td>

                    {/* ===== DROPDOWN ===== */}
                    <td className="relative">
                      <div ref={menuRef}>

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
                          <div className="absolute right-0 mt-2 w-36 bg-white border border-black/20 rounded-xl shadow-lg z-20">

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
                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(item.id)}
                                disabled={actionLoading === item.id}
                                className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50"
                              >
                                {actionLoading === item.id ? '...' : 'Approve'}
                              </button>
                            )}

                            {/* REJECT */}
                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleReject(item.id)}
                                disabled={actionLoading === item.id}
                                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                {actionLoading === item.id ? '...' : 'Reject'}
                              </button>
                            )}

                          </div>
                        )}
                  </div>
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
            className="bg-white rounded-2xl p-6 w-[400px] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-medium">
              Detail Pengajuan
            </h2>

            <div className="text-sm space-y-3">
              <div>
                <b>Nama:</b> {selected.name}
              </div>
              <div>
                <b>Email:</b> {selected.email}
              </div>
              <div>
                <b>Phone:</b> {selected.phone}
              </div>
              <div>
                <b>Lokasi:</b> {selected.location}
              </div>
              <div>
                <b>Kategori:</b> {selected.category}
              </div>
              <div>
                <b>Pengalaman:</b> {selected.experience}
              </div>
              <div>
                <b>Portfolio:</b>{' '}
                <a
                  href={selected.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {selected.portfolioLink}
                </a>
              </div>
              <div>
                <b>Tentang:</b>
                <p className="text-xs mt-1">{selected.aboutYou}</p>
              </div>
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
        </>
      )}
    </div>
  )
}

/* ================= BADGE ================= */

function StatusBadge({
  status,
}: {
  status: 'pending' | 'approved' | 'rejected'
}) {
  const styles = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    approved: 'bg-green-500/20 text-green-600',
    rejected: 'bg-red-500/20 text-red-500',
  }

  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}