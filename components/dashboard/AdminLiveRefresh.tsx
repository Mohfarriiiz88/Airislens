"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

const BOOKING_EVENT_NAME = "airislens-booking-created";
const REFRESH_INTERVAL_MS = 15000;

export default function AdminLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener(BOOKING_EVENT_NAME, refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(BOOKING_EVENT_NAME, refresh);
    };
  }, [router]);

  return null;
}
