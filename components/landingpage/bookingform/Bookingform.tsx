"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

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
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  error?: string | null;
};

type RowProps = {
  label: string;
  value: string;
};

type PaymentFeedback = {
  tone: "success" | "warning" | "error";
  message: string;
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
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<PaymentFeedback | null>(null);

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
      return;
    }

    if (!fgId) {
      setLoading(false);
      setError("No photographer selected. Please go back and select a photographer.");
      return;
    }

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/packages/${fgId}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${res.status}`);
        }

        const data = await res.json();

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

  useEffect(() => {
    if (!mounted || !fgId || !form.date) {
      setUnavailableTimes([]);
      setAvailabilityError(null);
      setAvailabilityLoading(false);
      return;
    }

    let ignore = false;
    const currentTime = form.time;

    const fetchAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(null);

      try {
        const response = await fetch(
          `/api/availability?fg=${encodeURIComponent(fgId)}&date=${encodeURIComponent(form.date)}`,
          {
            cache: "no-store",
          }
        );

        const data = (await response.json().catch(() => null)) as
          | { message?: string; unavailableTimes?: string[] }
          | null;

        if (!response.ok) {
          throw new Error(
            data?.message || "Gagal memuat jadwal yang sudah terisi."
          );
        }

        if (!ignore) {
          const nextUnavailable = data?.unavailableTimes ?? [];
          setUnavailableTimes(nextUnavailable);

          if (currentTime && nextUnavailable.includes(currentTime)) {
            setTimeError("Sudah terbooking");
          } else {
            setTimeError(null);
          }
        }
      } catch (err) {
        if (!ignore) {
          setUnavailableTimes([]);
          setAvailabilityError(
            err instanceof Error
              ? err.message
              : "Gagal memuat jadwal yang sudah terisi."
          );
        }
      } finally {
        if (!ignore) {
          setAvailabilityLoading(false);
        }
      }
    };

    void fetchAvailability();

    return () => {
      ignore = true;
    };
  }, [fgId, form.date, form.time, mounted]);

  // ================= SELECTED PACKAGE =================
  const selectedPackage = useMemo(() => {
    return packages.find((p) => p.id === Number(form.package) || p.id === form.package);
  }, [form.package, packages]);

  const update = (key: keyof BookingFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (value: string) => {
    update("time", value);
    setTimeError(unavailableTimes.includes(value) ? "Sudah terbooking" : null);
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    setPaymentFeedback(null);

    if (!form.name || !form.phone) {
      setPaymentFeedback({
        tone: "error",
        message: "Please fill in your name and WhatsApp number.",
      });
      return;
    }

    if (!form.date || !form.time) {
      setPaymentFeedback({
        tone: "error",
        message: "Please select a booking date and time.",
      });
      return;
    }

    if (!selectedPackage) {
      setPaymentFeedback({
        tone: "error",
        message: "Please select a package first.",
      });
      return;
    }

    if (unavailableTimes.includes(form.time)) {
      setTimeError("Sudah terbooking");
      setPaymentFeedback({
        tone: "error",
        message: "Selected time is no longer available.",
      });
      return;
    }

    const amount = Number(selectedPackage.price);

    if (amount <= 0) {
      setPaymentFeedback({
        tone: "error",
        message: "Invalid package price.",
      });
      return;
    }

    setSubmitLoading(true);

    try {
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

      const data = (await res.json().catch(() => null)) as
        | { error?: string; token?: string }
        | null;

      if (!res.ok) {
        if (res.status === 409) {
          setTimeError("Sudah terbooking");
        }
        setPaymentFeedback({
          tone: "error",
          message: data?.error || "Failed to create payment token.",
        });
        return;
      }

      if (!data?.token) {
        setPaymentFeedback({
          tone: "error",
          message: "Failed to create payment token.",
        });
        return;
      }

      if (typeof window.snap?.pay !== "function") {
        setPaymentFeedback({
          tone: "error",
          message: "Payment popup is not ready yet. Please try again.",
        });
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: function () {
          setPaymentFeedback({
            tone: "success",
            message:
              "Booking berhasil dibuat dan pembayaran Anda sukses. Status booking akan diperbarui otomatis.",
          });
        },
        onPending: function () {
          setPaymentFeedback({
            tone: "warning",
            message:
              "Booking sudah dibuat. Pembayaran Anda masih menunggu penyelesaian, dan status booking akan sinkron otomatis setelah Midtrans mengirim update.",
          });
        },
        onError: function () {
          setPaymentFeedback({
            tone: "error",
            message:
              "Pembayaran gagal diproses. Booking sudah tercatat, dan status akhirnya akan mengikuti update Midtrans.",
          });
        },
        onClose: function () {
          setPaymentFeedback({
            tone: "warning",
            message:
              "Popup pembayaran ditutup. Booking sudah dibuat dan tetap menunggu pembayaran sampai Midtrans mengirim status berikutnya.",
          });
        },
      });
    } catch (error) {
      setPaymentFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to start payment.",
      });
    } finally {
      setSubmitLoading(false);
    }
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
              options={BOOKING_TIME_SLOTS}
              value={form.time}
              onChange={handleTimeChange}
              disabledOptions={unavailableTimes}
              error={timeError}
            />
          </div>

          {form.date && (
            <div className="text-sm text-gray-500">
              {availabilityLoading && <p>Checking availability...</p>}
              {!availabilityLoading && availabilityError && (
                <p className="text-red-500">{availabilityError}</p>
              )}
              {!availabilityLoading && !availabilityError && unavailableTimes.length > 0 && (
                <p>
                  Unavailable times on this date: {unavailableTimes.join(", ")}
                </p>
              )}
            </div>
          )}

          {paymentFeedback && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                paymentFeedback.tone === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : paymentFeedback.tone === "warning"
                    ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                    : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {paymentFeedback.message}
            </div>
          )}

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
            disabled={loading || submitLoading || !selectedPackage || !fgId || !mounted}
            className={`px-6 py-3 rounded-md text-white ${
              loading || submitLoading || !selectedPackage || !fgId || !mounted
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black cursor-pointer"
            }`}
          >
            {loading || submitLoading ? "Processing..." : "Pay & Book"}
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

function Select({
  label,
  options,
  value,
  onChange,
  disabledOptions = [],
  error = null,
}: SelectProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border px-4 py-3 rounded-md outline-none ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-gray-300 focus:border-black"
        }`}
      >
        <option value="">Select time</option>
        {options.map((o: string) => (
          <option
            key={o}
            value={o}
            disabled={disabledOptions.includes(o)}
          >
            {disabledOptions.includes(o) ? `${o} - Sudah terbooking` : o}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
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
