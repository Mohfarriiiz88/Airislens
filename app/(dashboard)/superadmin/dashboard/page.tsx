import StatCard from "@/components/superdashboard/StatCard"
import AnalyticsPlaceholder from "@/components/superdashboard/AnalyticsPlaceholder"
import BookingTable from "@/components/superdashboard/BookingTable"

import UserList from "@/components/superdashboard/Userlist"
import PartnerList from "@/components/superdashboard/Partnerlist"
import { getSuperadminDashboardSnapshot } from "@/lib/superadmin-dashboard"

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function Page() {
  const snapshot = await getSuperadminDashboardSnapshot()

  return (
    <div className="space-y-6">

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Pengguna" value={formatNumber(snapshot.totalUsers)} />
        <StatCard title="Total Mitra" value={formatNumber(snapshot.totalPartners)} />
        <StatCard title="Total Booking" value={formatNumber(snapshot.totalBookings)} />
        <StatCard title="Pendapatan" value={formatCurrency(snapshot.totalRevenue)} />
      </div>

      {/* ===== ANALYTICS + PARTNER ===== */}
      <div className="grid grid-cols-3 gap-4">
        <AnalyticsPlaceholder />
        <PartnerList />
      </div>

      {/* ===== USER + BOOKING ===== */}
      <div className="grid grid-cols-2 gap-4">
        <UserList />
        <BookingTable />
      </div>

    </div>
  )
}
