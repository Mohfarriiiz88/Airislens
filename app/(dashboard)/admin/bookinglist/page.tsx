import { redirect } from "next/navigation";

import AdminLiveRefresh from "@/components/dashboard/AdminLiveRefresh";
import BookingManagement from "@/components/dashboard/BookingManagement";
import { listAdminBookings } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";

export default async function BookingListPage() {
  const session = await getServerSession();

  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const userId = Number(session.sub);
  const bookings = await listAdminBookings(userId);

  return (
    <>
      <AdminLiveRefresh />
      <BookingManagement bookings={bookings} />
    </>
  );
}
