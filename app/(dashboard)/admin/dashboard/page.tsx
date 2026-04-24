import StatCard from '@/components/dashboard/StatCard'
import AnalyticsPlaceholder from '@/components/dashboard/AnalyticsPlaceholder'
import UpcomingList from '@/components/dashboard/UpcomingList'
import BookingTable from '@/components/dashboard/BookingTable'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Booking" value="128" />
        <StatCard title="Booking Hari Ini" value="3" />
        <StatCard title="Bulan Ini" value="27" />
        <StatCard title="Pendapatan" value="Rp 12.500.000" />
      </div>

      {/* Analytics + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsPlaceholder />
        <UpcomingList />
      </div>

      {/* Table */}
      <BookingTable />
    </div>
  )
}