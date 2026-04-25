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
        <h1 className="text-[40px] font-normal text-black">
          Client Management
        </h1>
        <p className="text-lg text-black">
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
          className="w-full md:w-72 rounded-xl border border-black/20 bg-[#ffffff] px-4 py-2 text-sm text-black outline-none focus:border-black/20"
        />
      </div>

      {/* Client Table */}
      <div className="rounded-2xl border border-black/20 bg-[#ffffff] overflow-hidden">
        <table className="w-full text-sm text-left text-black">
          <thead className="bg-[#ffffff] text-black text-center">
            <tr>
              <th className="text-left font-medium px-6 py-4">Nama</th>
              <th className="font-medium px-6 py-4">WhatsApp</th>
              <th className="font-medium px-6 py-4">Total Booking</th>
              <th className="font-medium px-6 py-4">Last Booking</th>
              <th className="font-medium px-6 py-4">Status Terakhir</th>
              <th className="font-medium px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr
                key={client.id}
                className="text-center border-t border-black/20 hover:bg-white/10 transition"
              >
                <td className="px-6 py-4 text-left">
                  {client.name}
                </td>
                <td className="px-6 py-4">
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