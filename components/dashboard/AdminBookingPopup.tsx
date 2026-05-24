"use client";

import { useEffect, useRef, useState } from "react";

type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

type AdminBookingSummary = {
  id: number;
  orderId: string;
  customerName: string;
  packageName: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  status: BookingStatus;
};

type BookingPopupPayload = {
  customerName?: string;
  packageName?: string;
  date?: string;
  time?: string;
  location?: string;
};

const BOOKING_EVENT_NAME = "airislens-booking-created";
const POLL_INTERVAL_MS = 5000;
const AUTO_HIDE_MS = 9000;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));
}

function buildPopupFromPayload(payload: BookingPopupPayload) {
  return {
    title: "Booking baru masuk",
    customerName: payload.customerName || "Pelanggan baru",
    packageName: payload.packageName || "Paket belum diketahui",
    bookingDate: payload.date || "",
    bookingTime: payload.time || "",
    location: payload.location || "",
  };
}

function buildPopupFromBooking(booking: AdminBookingSummary) {
  return {
    title: "Booking baru masuk",
    customerName: booking.customerName,
    packageName: booking.packageName,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    location: booking.location,
  };
}

export default function AdminBookingPopup() {
  const [popup, setPopup] = useState<ReturnType<typeof buildPopupFromPayload> | null>(
    null
  );
  const latestBookingIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let hideTimeout: number | undefined;

    const showPopup = (
      nextPopup: ReturnType<typeof buildPopupFromPayload>
    ) => {
      if (!isMounted) {
        return;
      }

      if (hideTimeout) {
        window.clearTimeout(hideTimeout);
      }

      setPopup(nextPopup);
      hideTimeout = window.setTimeout(() => {
        setPopup(null);
      }, AUTO_HIDE_MS);
    };

    const fetchLatestBooking = async () => {
      const response = await fetch("/api/admin/bookings/latest", {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        latestBooking: AdminBookingSummary | null;
      };

      return data.latestBooking;
    };

    const syncLatestBooking = async () => {
      const latestBooking = await fetchLatestBooking();

      if (!isMounted || !latestBooking) {
        initializedRef.current = true;
        return;
      }

      if (!initializedRef.current) {
        latestBookingIdRef.current = latestBooking.id;
        initializedRef.current = true;
        return;
      }

      if (latestBookingIdRef.current === null) {
        latestBookingIdRef.current = latestBooking.id;
        showPopup(buildPopupFromBooking(latestBooking));
        return;
      }

      if (latestBooking.id !== latestBookingIdRef.current) {
        latestBookingIdRef.current = latestBooking.id;
        showPopup(buildPopupFromBooking(latestBooking));
        return;
      }

      latestBookingIdRef.current = latestBooking.id;
    };

    const handleBookingEvent = (event: Event) => {
      const customEvent = event as CustomEvent<BookingPopupPayload | undefined>;
      showPopup(buildPopupFromPayload(customEvent.detail || {}));
      void syncLatestBooking();
    };

    void syncLatestBooking();

    const intervalId = window.setInterval(() => {
      void syncLatestBooking();
    }, POLL_INTERVAL_MS);

    window.addEventListener(BOOKING_EVENT_NAME, handleBookingEvent as EventListener);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (hideTimeout) {
        window.clearTimeout(hideTimeout);
      }
      window.removeEventListener(
        BOOKING_EVENT_NAME,
        handleBookingEvent as EventListener
      );
    };
  }, []);

  if (!popup) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-[80] w-full max-w-sm rounded-2xl border border-black/15 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-black">{popup.title}</p>
          <p className="mt-1 text-sm text-black/70">
            {popup.customerName} memesan {popup.packageName}
          </p>
          <p className="mt-2 text-xs text-black/55">
            {popup.bookingDate
              ? `${formatDate(popup.bookingDate)} - ${popup.bookingTime}`
              : "Jadwal booking baru masuk"}
          </p>
          <p className="mt-1 text-xs text-black/50">
            {popup.location || "Lokasi belum diisi"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPopup(null)}
          className="text-sm text-black/40 transition hover:text-black"
          aria-label="Tutup popup booking"
        >
          x
        </button>
      </div>
    </div>
  );
}
