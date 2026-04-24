'use client'

import { useState } from 'react'

type Booking = {
  id: string
  name: string
  package: string
  date: string
  time: string
  location: string
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
}

const dummyBookings: Booking[] = [
  {
    id: 'BK-001',
    name: 'Andi Pratama',
    package: 'Portrait',
    date: '12 Mar 2026',
    time: '10:00',
    location: 'Alun-alun Tegal',
    status: 'Pending',
  },
  {
    id: 'BK-002',
    name: 'Siti Aisyah',
    package: 'Couple',
    date: '13 Mar 2026',
    time: '13:00',
    location: 'Studio',
    status: 'Confirmed',
  },
  {
    id: 'BK-003',
    name: 'Rizky Maulana',
    package: 'Bestie',
    date: '14 Mar 2026',
    time: '16:00',
    location: 'Cafe',
    status: 'Completed',
  },
]

export default function BookingListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredData = dummyBookings.filter((booking) => {
    const matchSearch = booking.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchStatus =
      statusFilter === 'All' || booking.status === statusFilter

    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Booking Management
        </h1>
        <p className="text-sm text-white/60">
          Kelola seluruh booking pelanggan Beranjak Photo
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Cari nama pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-72 rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none focus:border-white/30"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="All">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden">
        <table className="w-full text-sm text-left text-white">
          <thead className="bg-[#1A1A1A] text-white/70">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Paket</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4">Lokasi</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((booking) => (
              <tr
                key={booking.id}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4">{booking.id}</td>
                <td className="px-6 py-4">{booking.name}</td>
                <td className="px-6 py-4">{booking.package}</td>
                <td className="px-6 py-4">
                  {booking.date} — {booking.time}
                </td>
                <td className="px-6 py-4">{booking.location}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="px-6 py-4">
                  <button className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10 transition">
                    Detail
                  </button>
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-white/50"
                >
                  Tidak ada data booking
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: Booking['status']
}) {
  const base =
    'px-3 py-1 rounded-full text-xs font-medium'

  const styles = {
    Pending: 'bg-yellow-500/20 text-yellow-400',
    Confirmed: 'bg-blue-500/20 text-blue-400',
    Completed: 'bg-green-500/20 text-green-400',
    Cancelled: 'bg-red-500/20 text-red-400',
  }

  return (
    <span className={`${base} ${styles[status]}`}>
      {status}
    </span>
  )
}