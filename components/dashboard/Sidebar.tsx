'use client'

import Link from 'next/link'

const menu = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Booking', href: '/admin/bookinglist' },
  { label: 'Jadwal', href: '/admin/jadwal' },
  { label: 'Paket', href: '/admin/paket' },
  { label: 'Klien', href: '/admin/client' },
  { label: 'Galeri', href: '/admin/galeri' },
]

export default function Sidebar() {
  return (
    <aside className="w-58 bg-[#ffffff] border-r border-black/20 px-5 py-6">
      <div className="mb-10">
        <div className="text-xl font-normal text-black text-[40px] mb-[-8]">
          AirisLens
        </div>
        <div className="text-normal text-black text-[18px]">
          Admin Dashboard 
        </div>
      </div>

      <nav className="space-y-2">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="
              block rounded-lg text-[18px] py-2
              text-normal text-black  
              hover:bg-black/10 hover:text-black
              transition
            "
          >
            {m.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}