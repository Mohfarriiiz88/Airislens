'use client'

import { useState } from 'react'

type Client = {
  id: string
  name: string
  phone: string
  totalBooking: number
  lastBooking: string
  lastStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
}

const CLIENTS: Client[] = [
  {
    id: 'CL-001',
    name: 'Andi Pratama',
    phone: '081234567890',
    totalBooking: 3,
    lastBooking: '12 Mar 2026',
    lastStatus: 'Pending',
  },
  {
    id: 'CL-002',
    name: 'Siti Aisyah',
    phone: '082345678901',
    totalBooking: 5,
    lastBooking: '13 Mar 2026',
    lastStatus: 'Completed',
  },
  {
    id: 'CL-003',
    name: 'Rizky Maulana',
    phone: '083456789012',
    totalBooking: 2,
    lastBooking: '14 Mar 2026',
    lastStatus: 'Confirmed',
  },
]

export default function AdminClientPage() {
  const [search, setSearch] = useState('')

  const filteredClients = CLIENTS.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Client Management
        </h1>
        <p className="text-sm text-white/60">
          Kelola data klien Beranjak Photo
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Cari nama client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-72 rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      {/* Client Table */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden">
        <table className="w-full text-sm text-left text-white">
          <thead className="bg-[#1A1A1A] text-white/70">
            <tr>
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Total Booking</th>
              <th className="px-6 py-4">Last Booking</th>
              <th className="px-6 py-4">Status Terakhir</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr
                key={client.id}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4 font-medium">
                  {client.name}
                </td>
                <td className="px-6 py-4 text-white/70">
                  {client.phone}
                </td>
                <td className="px-6 py-4">
                  {client.totalBooking}
                </td>
                <td className="px-6 py-4">
                  {client.lastBooking}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.lastStatus} />
                </td>
                <td className="px-6 py-4">
                  <button className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/10 transition">
                    Detail
                  </button>
                </td>
              </tr>
            ))}

            {filteredClients.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-white/50"
                >
                  Tidak ada data client
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
  status: Client['lastStatus']
}) {
  const styles = {
    Pending: 'bg-yellow-500/20 text-yellow-400',
    Confirmed: 'bg-blue-500/20 text-blue-400',
    Completed: 'bg-green-500/20 text-green-400',
    Cancelled: 'bg-red-500/20 text-red-400',
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}