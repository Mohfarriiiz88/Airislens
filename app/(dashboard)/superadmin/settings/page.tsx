'use client'

import { useEffect, useState } from 'react'

type Summary = {
  hasServerKey: boolean
  serverKeyPreview: string | null
  clientKey: string | null
  isProduction: boolean
  updatedAt: string | null
  usingEnvFallback: {
    serverKey: boolean
    clientKey: boolean
  }
}

export default function SettingsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [serverKey, setServerKey] = useState('')
  const [showServerKey, setShowServerKey] = useState(false)
  const [clientKey, setClientKey] = useState('')
  const [isProduction, setIsProduction] = useState(false)

  async function fetchSummary() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/superadmin/settings/midtrans', {
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error('Gagal memuat konfigurasi.')
      }

      const data = (await res.json()) as Summary
      setSummary(data)
      setClientKey(data.clientKey ?? '')
      setIsProduction(data.isProduction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/superadmin/settings/midtrans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverKey: serverKey.trim() || null,
          clientKey: clientKey.trim() || null,
          isProduction,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan.')
      }

      setSuccess(data.message || 'Konfigurasi berhasil diperbarui.')
      setServerKey('')
      setShowServerKey(false)
      await fetchSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-[40px] text-black">Pengaturan</h1>
        <p className="text-lg text-black">
          Konfigurasi gateway pembayaran Midtrans
        </p>
      </div>

      {/* ===== ALERTS ===== */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-black/50">Memuat data...</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-black/20 bg-white p-6 space-y-6 max-w-2xl"
        >
          {/* ===== STATUS INFO ===== */}
          <div className="text-sm text-black/70 space-y-1">
            <div>
              Status kunci server:{' '}
              {summary?.hasServerKey ? (
                <span className="font-medium text-green-700">
                  Terisi ({summary.serverKeyPreview})
                </span>
              ) : (
                <span className="font-medium text-red-600">Belum diisi</span>
              )}
            </div>
            {summary?.updatedAt && (
              <div>
                Terakhir diperbarui:{' '}
                {new Date(summary.updatedAt).toLocaleString('id-ID')}
              </div>
            )}
            {(summary?.usingEnvFallback.serverKey ||
              summary?.usingEnvFallback.clientKey) && (
              <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-300 px-3 py-2 text-yellow-800">
                Masih menggunakan nilai dari .env untuk{' '}
                {[
                  summary.usingEnvFallback.serverKey ? 'kunci server' : null,
                  summary.usingEnvFallback.clientKey ? 'kunci klien' : null,
                ]
                  .filter(Boolean)
                  .join(' & ')}
                . Simpan konfigurasi untuk override.
              </div>
            )}
          </div>

          {/* ===== SERVER KEY ===== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-black">
              Kunci Server
            </label>
            <div className="flex gap-2">
              <input
                type={showServerKey ? 'text' : 'password'}
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                placeholder={
                  summary?.hasServerKey
                    ? `Biarkan kosong untuk mempertahankan ${summary.serverKeyPreview}`
                    : 'Masukkan Midtrans server key'
                }
                className="flex-1 rounded-xl border border-black/20 px-4 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowServerKey((prev) => !prev)}
                className="px-3 py-2 rounded-xl border border-black/20 text-sm hover:bg-black/5"
              >
                {showServerKey ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
            <p className="text-xs text-black/50">
              Kunci server disimpan terenkripsi (AES-256-GCM) di database.
              Kosongkan bila tidak ingin mengganti.
            </p>
          </div>

          {/* ===== CLIENT KEY ===== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-black">
              Kunci Klien
            </label>
            <input
              type="text"
              value={clientKey}
              onChange={(e) => setClientKey(e.target.value)}
              placeholder="SB-Mid-client-..."
              className="w-full rounded-xl border border-black/20 px-4 py-2 text-sm"
            />
            <p className="text-xs text-black/50">
              Kunci klien disisipkan ke snap.js pada layout root. Nilai ini publik.
            </p>
          </div>

          {/* ===== ENVIRONMENT ===== */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-black">
              Lingkungan
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="env"
                  checked={!isProduction}
                  onChange={() => setIsProduction(false)}
                />
                Uji Coba
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="env"
                  checked={isProduction}
                  onChange={() => setIsProduction(true)}
                />
                Produksi
              </label>
            </div>
            <p className="text-xs text-black/50">
              Mengatur URL snap.js (sandbox/production) dan flag isProduction
              untuk API Midtrans.
            </p>
          </div>

          {/* ===== SUBMIT ===== */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black text-white px-5 py-2 text-sm hover:bg-black/80 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
