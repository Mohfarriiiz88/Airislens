
import { Suspense } from "react";
import BookingForm from "@/components/landingpage/bookingform/Bookingform";
import Navbar from "@/components/ui/navbar/Navbar";

export default function BookingPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <BookingForm />
      </Suspense>
    </>
  );
}
