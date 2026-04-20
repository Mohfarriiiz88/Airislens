"use client";

import { useMemo, useState } from "react";

type PackageOption = {
  value: string;
  label: string;
  desc: string;
  price: string;
  duration: string;
};

const PACKAGES: PackageOption[] = [
  {
    value: "portrait",
    label: "Portrait",
    desc: "Perfect for personal branding or graduation.",
    price: "IDR 250K",
    duration: "60 min",
  },
  {
    value: "couple",
    label: "Couple",
    desc: "Prewedding or couple session.",
    price: "IDR 350K",
    duration: "90 min",
  },
  {
    value: "event",
    label: "Event",
    desc: "Small event documentation.",
    price: "IDR 450K",
    duration: "120 min",
  },
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "15:00",
  "17:00",
];

export default function BookingForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    package: "portrait",
    date: "",
    time: "",
    location: "",
    note: "",
  });

  const selectedPackage = useMemo(
    () => PACKAGES.find((p) => p.value === form.package),
    [form.package],
  );

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 md:px-20 py-10 font-[NeueHaas] text-black"
    >
      {/* ================= HEADER ================= */}
      <div className="mb-12 mt-10">
        <h1 className="text-[24px] md:text-[40px] font-normal leading-tight">
         Form Booking
        </h1>

        <p className="mt-2 text-[18px] md:text-[20px] max-w-xl">
          Fill out the form below to book your session. We will contact you via
          WhatsApp for confirmation.
        </p>
      </div>

      {/* ================= LAYOUT ================= */}
      <div className="grid md:grid-cols-[1fr_380px] gap-10">
        {/* ================= FORM ================= */}
        <div className="space-y-6 text-[18px]">
          {/* NAME + PHONE */}
          <div className="grid md:grid-cols-2 gap-4 text-[18px]">
            <Input label="Full Name" placeholder="Your name" />
            <Input label="WhatsApp Number" placeholder="08xxxx" />
          </div>

          {/* PACKAGE */}
          <div>
            <p className="mb-3 text-[18px]">Select Package</p>

            <div className="grid md:grid-cols-3 gap-4">
              {PACKAGES.map((p) => {
                const active = form.package === p.value;

                return (
                  <div
                    key={p.value}
                    onClick={() => update("package", p.value)}
                    className={`border p-4 rounded-md cursor-pointer transition ${
  active
    ? "bg-black text-white border-black"
    : "border-gray-200 hover:border-black"
}`}
                  >
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm mt-1">{p.duration}</p>
                    <p className="text-sm mt-2">{p.price}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DATE + TIME */}
          <div className="grid md:grid-cols-2 gap-4">
            <Input type="date" label="Date" />
            <Select label="Time" options={TIME_SLOTS} />
          </div>

          {/* LOCATION */}
          <Input label="Location" placeholder="Enter location" />

          {/* NOTE */}
          <Textarea label="Notes (optional)" />

          {/* BUTTON */}
          <button className="bg-black text-white px-6 py-3 rounded-md text-sm">
            Submit Booking
          </button>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="border border-gray-200 p-6 rounded-md h-fit">
          <p className="text-[18px] font-medium mb-4">Summary</p>

          <div className="space-y-3 text-sm">
            <Row label="Package" value={selectedPackage?.label || "-"} />
            <Row label="Duration" value={selectedPackage?.duration || "-"} />
            <Row label="Date" value={form.date || "-"} />
            <Row label="Time" value={form.time || "-"} />
            <Row label="Location" value={form.location || "-"} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= COMPONENT ================= */

function Input({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full border border-gray-300 px-4 py-3 rounded-md outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({ label }: { label: string }) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <textarea className="w-full border border-gray-300 px-4 py-3 rounded-md min-h-[120px] outline-none focus:border-black" />
    </div>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <select className="w-full border border-gray-300 px-4 py-3 rounded-md outline-none focus:border-black">
        <option value="">Select time</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
