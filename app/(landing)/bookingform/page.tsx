
import { Suspense } from "react";
import BookingForm from "@/components/landingpage/bookingform/Bookingform";
import Navbar from "@/components/ui/navbar/Navbar";
import { getServerSession } from "@/lib/auth/session";

export default async function BookingPage() {
  const session = await getServerSession();

  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <BookingForm isAuthenticated={Boolean(session)} />
      </Suspense>
    </>
  );
}
