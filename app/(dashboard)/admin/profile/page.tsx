'use client'

import { useState } from 'react'

type Profile = {
  name: string
  description: string
  specializations: string[]
  location: string
  phone: string
  instagram: string
}

const SPECIALIZATION_OPTIONS = [
  'Prewedding & Wedding',
  'Portrait & Personal Branding',
  'Event Documentation',
  'Fashion & Editorial',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    name: 'Beranjak Photo',
    description:
      'Beranjak Photo is a professional photography team specializing in capturing moments...',
    specializations: ['Prewedding & Wedding'],
    location: 'Tegal',
    phone: '081234567890',
    instagram: '@beranjakphoto',
  })

  function handleChange(field: keyof Profile, value: any) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handleCheckbox(value: string) {
    setProfile((prev) => {
      const exists = prev.specializations.includes(value)

      return {
        ...prev,
        specializations: exists
          ? prev.specializations.filter((s) => s !== value)
          : [...prev.specializations, value],
      }
    })
  }

  function handleSubmit() {
    console.log('SAVE PROFILE:', profile)

    alert('Profile berhasil disimpan')

    // 🔥 nanti kirim ke backend
    // await fetch('/api/profile', { method: 'POST', body: JSON.stringify(profile) })
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-[40px] text-black">
          Profile Settings
        </h1>
        <p className="text-lg text-black">
          Atur informasi profil fotografer
        </p>
      </div>

      {/* ===== FORM ===== */}
      <div className="space-y-6">

        {/* NAME */}
        <div>
          <label className="text-sm text-black">Nama Brand</label>
          <input
            value={profile.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full mt-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm text-black">Deskripsi</label>
          <textarea
            rows={4}
            value={profile.description}
            onChange={(e) =>
              handleChange('description', e.target.value)
            }
            className="w-full mt-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* SPECIALIZATION */}
        <div>
          <label className="text-sm text-black">
            Specializations
          </label>

          <div className="mt-2 space-y-2">
            {SPECIALIZATION_OPTIONS.map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={profile.specializations.includes(item)}
                  onChange={() => handleCheckbox(item)}
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        {/* LOCATION */}
        <div>
          <label className="text-sm text-black">Alamat</label>
          <input
            value={profile.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full mt-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* PHONE */}
        <div>
          <label className="text-sm text-black">No. WhatsApp</label>
          <input
            value={profile.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full mt-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* INSTAGRAM */}
        <div>
          <label className="text-sm text-black">Instagram</label>
          <input
            value={profile.instagram}
            onChange={(e) => handleChange('instagram', e.target.value)}
            className="w-full mt-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          className="w-full bg-black text-white py-3 rounded-xl text-sm hover:opacity-90"
        >
          Simpan Profile
        </button>
      </div>
    </div>
  )
}