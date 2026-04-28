"use client";

import { useState } from "react";

const tabs = ["All", "Pending", "Completed"];

const bookings = [
  {
    id: "#AIRIS001",
    photographer: "Beranjak Photo",
    date: "12 June 2026",
    price: "IDR 5,000,000",
    status: "Completed",
  },
  {
    id: "#AIRIS002",
    photographer: "Noir Studio",
    date: "20 June 2026",
    price: "IDR 3,500,000",
    status: "Pending",
  },
  {
    id: "#AIRIS003",
    photographer: "Velour Visual",
    date: "28 June 2026",
    price: "IDR 4,000,000",
    status: "Completed",
  },
];

export default function BookingHistory() {
  const [activeTab, setActiveTab] = useState("All");

  const filtered =
    activeTab === "All"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-[#f5f5f5] px-6 md:px-20 py-10 font-[NeueHaas]"
    >
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-14 mt-10">
        
        {/* LEFT */}
        <h1 className="text-black text-[24px] md:text-[40px] leading-tight">
          Booking <br /> History
        </h1>

        {/* RIGHT */}
        <p className="text-black text-[18px] md:text-[20px] max-w-md mt-4 md:mt-0 leading-relaxed">
          Track your photography sessions, manage your bookings, and review
          your past experiences with our photographers.
        </p>
      </div>

      {/* ================= FILTER ================= */}
      <div className="flex gap-8 mb-10 text-gray-400 text-[18px]">
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

      {/* ================= LIST ================= */}
      <div className="space-y-6">

        {filtered.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-black/10 p-6 rounded-md flex flex-col md:flex-row justify-between gap-6"
          >
            {/* LEFT */}
            <div className="space-y-2">
              <p className="text-[16px] text-black/60">
                Booking ID: {item.id}
              </p>

              <h2 className="text-[20px] text-black">
                {item.photographer}
              </h2>

              <p className="text-[16px] text-black/70">
                Shooting Date: {item.date}
              </p>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col md:items-end justify-between gap-3">

              {/* STATUS */}
              <p
                className={`text-[16px] ${
                  item.status === "Completed"
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              >
                {item.status}
              </p>

              {/* PRICE */}
              <p className="text-[18px] text-black">
                {item.price}
              </p>

              {/* BUTTON */}
              {item.status === "Pending" && (
                <button className="bg-black text-white px-4 py-2 rounded-md text-[14px] hover:bg-black/80 transition">
                  Continue Booking
                </button>
              )}
            </div>
          </div>
        ))}

      </div>
    </section>
  );
}