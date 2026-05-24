"use client";

import { useMemo, useState } from "react";

import { type UserBookingHistoryItem } from "@/lib/bookings";

type BookingHistoryProps = {
  bookings: UserBookingHistoryItem[];
};

const tabs = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;

function formatDate(date: string, time: string) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} - ${time}`;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BookingHistory({ bookings }: BookingHistoryProps) {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("All");

  const filtered = useMemo(() => {
    if (activeTab === "All") {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === activeTab);
  }, [activeTab, bookings]);

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-6 md:px-20 py-10 font-[NeueHaas]"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-14 mt-10">
        <h1 className="text-black text-[24px] md:text-[40px] leading-tight">
          Booking <br /> History
        </h1>

        <p className="text-black text-[18px] md:text-[20px] max-w-md mt-4 md:mt-0 leading-relaxed">
          Track your photography sessions, manage your bookings, and review
          your past experiences with our photographers.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 mb-10 text-gray-400 text-[18px]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`transition ${
              activeTab === tab
                ? "text-black font-medium"
                : "hover:text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="bg-white border border-black/10 p-6 rounded-md text-black/60">
            Belum ada riwayat booking untuk filter ini.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-black/10 p-6 rounded-md flex flex-col md:flex-row justify-between gap-6"
            >
              <div className="space-y-2">
                <p className="text-[16px] text-black/60">
                  Booking ID: {item.orderId}
                </p>

                <h2 className="text-[20px] text-black">
                  {item.photographerName}
                </h2>

                <p className="text-[16px] text-black/70">
                  Shooting Date: {formatDate(item.bookingDate, item.bookingTime)}
                </p>

                <p className="text-[15px] text-black/55">
                  Location: {item.location || "Lokasi belum diisi"}
                </p>
              </div>

              <div className="flex flex-col md:items-end justify-between gap-3">
                <p
                  className={`text-[16px] ${
                    item.status === "Completed"
                      ? "text-green-600"
                      : item.status === "Cancelled"
                        ? "text-red-600"
                        : item.status === "Confirmed"
                          ? "text-blue-600"
                          : "text-yellow-600"
                  }`}
                >
                  {item.status}
                </p>

                <p className="text-[18px] text-black">
                  {formatPrice(item.amount)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
