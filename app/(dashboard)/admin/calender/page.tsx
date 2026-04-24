'use client'

import { useState } from 'react'

type CalendarBooking = {
  id: string
  name: string
  paket: string
  date: string
  time: string
  location: string
}

const BOOKINGS: CalendarBooking[] = [
  {
    id: 'BK-001',
    name: 'Andi',
    paket: 'Portrait',
    date: '2026-03-12',
    time: '10:00',
    location: 'Alun-alun',
  },
  {
    id: 'BK-002',
    name: 'Siti',
    paket: 'Couple',
    date: '2026-03-12',
    time: '13:00',
    location: 'Studio',
  },
  {
    id: 'BK-003',
    name: 'Rizky',
    paket: 'Bestie',
    date: '2026-03-14',
    time: '16:00',
    location: 'Cafe',
  },
]

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState('2026-03-12')

  const todayBookings = BOOKINGS
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Kalender Booking
        </h1>
        <p className="text-sm text-white/60">
          Jadwal pemotretan berdasarkan tanggal
        </p>
      </div>

      {/* Date Picker */}
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      {/* Booking List */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
        {todayBookings.length === 0 ? (
          <p className="text-sm text-white/50">
            Tidak ada booking di tanggal ini.
          </p>
        ) : (
          <div className="space-y-4">
            {todayBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1A1A] p-4 hover:bg-white/5 transition"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {b.time} — {b.paket}
                  </p>
                  <p className="text-xs text-white/60">
                    {b.name} · {b.location}
                  </p>
                </div>

                <span className="text-xs text-white/50">
                  #{b.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}