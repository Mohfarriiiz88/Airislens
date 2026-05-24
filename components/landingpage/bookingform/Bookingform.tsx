"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "15:00",
  "17:00",
];

type BookingFormState = {
  name: string;
  phone: string;
  package: string | number;
  date: string;
  time: string;
  location: string;
  note: string;
};

type PartnerPackage = {
  id: number;
  name: string;
  duration: string;
  price: number;
  description?: string;
};

type InputProps = {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
};

type TextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type SelectProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

type RowProps = {
  label: string;
  value: string;
};

export default function BookingForm() {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    phone: "",
    package: "" as string | number,
    date: "",
    time: "",
    location: "",
    note: "",
  });

  const [packages, setPackages] = useState<PartnerPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const searchParams = useSearchParams();
  const fgId = searchParams.get("fg");

  // ================= MOUNT CHECK =================
  useEffect(() => {
    setMounted(true);
  }, []);

  // ================= FETCH PACKAGE =================
  useEffect(() => {
    // Wait for component to mount and searchParams to be ready
    if (!mounted) {
      console.log("Component not mounted yet");
      return;
    }

    if (!fgId) {
      console.warn("No photographer ID found in URL parameter 'fg'");
      setLoading(false);
      setError("No photographer selected. Please go back and select a photographer.");
      return;
    }

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching packages for fgId:", fgId);

        const res = await fetch(`/api/packages/${fgId}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${res.status}`);
        }

        const data = await res.json();
        console.log("Packages received:", data);

        setPackages(data.packages || []);

        if (data.packages?.length > 0) {
          setForm((prev) => ({
            ...prev,
            package: data.packages[0].id,
          }));
        } else {
          setError("No packages available for this photographer");
        }
      } catch (err) {
        console.error("Error fetching packages:", err);
        setError(err instanceof Error ? err.message : "Failed to load packages");
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [fgId, mounted]);

  // ================= SELECTED PACKAGE =================
  const selectedPackage = useMemo(() => {
    return packages.find((p) => p.id === Number(form.package) || p.id === form.package);
  }, [form.package, packages]);

  const update = (key: keyof BookingFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    if (!form.name || !form.phone) {
      alert("Please fill name and phone");
      return;
    }

    if (!form.date || !form.time) {
      alert("Please select date and time");
      return;
    }

    if (!selectedPackage) {
      alert("Please select a package");
      return;
    }

    const amount = Number(selectedPackage.price);

    if (amount <= 0) {
      alert("Invalid package price");
      return;
    }

    const res = await fetch("/api/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        amount,
        package: selectedPackage.name,
        packageId: selectedPackage.id,
        photographerId: Number(fgId),
        date: form.date,
        time: form.time,
        location: form.location,
        note: form.note,
      }),
    });

    const data = await res.json();

    if (!data.token) {
      alert("Failed to create payment token");
      return;
    }

    window.snap.pay(data.token, {
      onSuccess: function () {
        alert("Payment success");
      },
      onPending: function () {
        console.log("Pending");
      },
      onError: function () {
        console.log("Error");
      },
    });
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
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Your name"
              value={form.name}
              onChange={(v) => update("name", v)}
            />
            <Input
              label="WhatsApp Number"
              placeholder="08xxxx"
              value={form.phone}
              onChange={(v) => update("phone", v)}
            />
          </div>

          {/* ================= PACKAGE ================= */}
          <div>
            <p className="mb-3">Select Package</p>

            {error && (
              <p className="text-sm text-red-500 mb-3">
                ⚠️ {error}
              </p>
            )}

            {loading && (
              <p className="text-sm text-gray-400">Loading packages...</p>
            )}

            {!loading && packages.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                {packages.map((p) => {
                  const active = Number(form.package) === Number(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => update("package", Number(p.id))}
                      className={`border p-4 rounded-md cursor-pointer transition ${
                        active
                          ? "bg-black text-white border-black"
                          : "border-gray-200 hover:border-black"
                      }`}
                    >
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm mt-1">{p.duration}</p>
                      <p className="text-sm mt-2">
                        Rp {Number(p.price).toLocaleString("id-ID")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && packages.length === 0 && !error && (
              <p className="text-sm text-gray-400 mt-2">
                No packages available for this photographer
              </p>
            )}
          </div>

          {/* DATE + TIME */}
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Date"
              value={form.date}
              onChange={(v) => update("date", v)}
            />

            <Select
              label="Time"
              options={TIME_SLOTS}
              value={form.time}
              onChange={(v) => update("time", v)}
            />
          </div>

          {/* LOCATION */}
          <Input
            label="Location"
            placeholder="Enter location"
            value={form.location}
            onChange={(v) => update("location", v)}
          />

          {/* NOTES */}
          <Textarea
            label="Notes (optional)"
            value={form.note}
            onChange={(v) => update("note", v)}
          />

          {/* BUTTON */}
          <button
            onClick={handlePayment}
            disabled={loading || !selectedPackage || !fgId || !mounted}
            className={`px-6 py-3 rounded-md text-white ${
              loading || !selectedPackage || !fgId || !mounted
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black cursor-pointer"
            }`}
          >
            {loading ? "Loading..." : "Pay & Book"}
          </button>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="border border-gray-200 p-6 rounded-md h-fit">
          <p className="text-[18px] font-medium mb-4">Summary</p>

          <div className="space-y-3 text-sm">
            <Row label="Package" value={selectedPackage?.name || "-"} />
            <Row label="Duration" value={selectedPackage?.duration || "-"} />
            <Row label="Date" value={form.date || "-"} />
            <Row label="Time" value={form.time || "-"} />
            <Row label="Location" value={form.location || "-"} />
            <div className="border-t border-gray-200 pt-3 mt-3">
              <Row 
                label="Price" 
                value={selectedPackage?.price ? `Rp ${Number(selectedPackage.price).toLocaleString("id-ID")}` : "-"} 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= COMPONENT ================= */

function Input({ label, placeholder, type = "text", value, onChange }: InputProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 px-4 py-3 rounded-md outline-none focus:border-black"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: TextareaProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md min-h-[120px] outline-none focus:border-black"
      />
    </div>
  );
}

function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 px-4 py-3 rounded-md outline-none focus:border-black"
      >
        <option value="">Select time</option>
        {options.map((o: string) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
