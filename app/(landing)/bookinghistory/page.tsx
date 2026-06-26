import BookingHistory from "@/components/landingpage/bookinghistory/BookingHistory";
import Navbar from "@/components/ui/navbar/Navbar";
import { listUserBookingHistory } from "@/lib/bookings";
import { getServerSession } from "@/lib/auth/session";
import { reconcilePendingPaymentsForUser } from "@/lib/midtrans";
import { redirect } from "next/navigation";

export default async function BookingPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "user") {
    redirect("/");
  }

  const userId = Number(session.sub);
  await reconcilePendingPaymentsForUser(userId);
  const bookings = await listUserBookingHistory(userId);

  return (
    <>
      <Navbar />
      <BookingHistory bookings={bookings} />
    </>
  );
}
