import StatCard from "@/components/superdashboard/StatCard"
import AnalyticsPlaceholder from "@/components/superdashboard/AnalyticsPlaceholder"
import BookingTable from "@/components/superdashboard/BookingTable"

import UserList from "@/components/superdashboard/Userlist"
import PartnerList from "@/components/superdashboard/Partnerlist"

export default function Page() {
  return (
    <div className="space-y-6">

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total User" value="1,245" />
        <StatCard title="Total Partner" value="58" />
        <StatCard title="Total Booking" value="3,421" />
        <StatCard title="Revenue" value="Rp 245.000.000" />
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