import { redirect } from "next/navigation";

import AnalyticsPlaceholder from "@/components/dashboard/AnalyticsPlaceholder";
import AdminLiveRefresh from "@/components/dashboard/AdminLiveRefresh";
import BookingTable from "@/components/dashboard/BookingTable";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingList from "@/components/dashboard/UpcomingList";
import { getBookingDashboardSnapshot } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";
import { reconcilePendingPaymentsForPartner } from "@/lib/midtrans";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const userId = Number(session.sub);
  await reconcilePendingPaymentsForPartner(userId);
  const snapshot = await getBookingDashboardSnapshot(userId);

  return (
    <div className="space-y-6">
      <AdminLiveRefresh />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Booking"
          value={String(snapshot.totalBookings)}
        />
        <StatCard
          title="Booking Hari Ini"
          value={String(snapshot.todayBookings)}
        />
        <StatCard title="Bulan Ini" value={String(snapshot.monthBookings)} />
        <StatCard
          title="Pendapatan Fotografer"
          value={formatCurrency(snapshot.totalRevenue)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsPlaceholder statusBreakdown={snapshot.statusBreakdown} />
        <UpcomingList bookings={snapshot.upcomingBookings} />
      </div>

      <BookingTable bookings={snapshot.recentBookings} />
    </div>
  );
}
