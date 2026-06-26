"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

const BookingLocationMap = dynamic(
  () => import("@/components/landingpage/bookingform/BookingLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
        <div className="border-b border-black/6 bg-[linear-gradient(135deg,#111111_0%,#3a3129_100%)] px-5 py-4 text-white">
          <p className="text-[13px] uppercase tracking-[0.16em] text-white/70">
            Event Location
          </p>
          <h3 className="mt-1 text-[18px]">Pilih titik acara di peta</h3>
        </div>
        <div className="flex h-[420px] items-center justify-center p-4 text-sm text-black/55">
          Memuat peta...
        </div>
      </div>
    ),
  }
);

type BookingFormState = {
  name: string;
  phone: string;
  package: string | number;
  date: string;
  time: string;
  eventAddress: string;
  eventLatitude: string;
  eventLongitude: string;
  note: string;
};

type PartnerPackage = {
  id: number;
  name: string;
  duration: string;
  price: number;
  description?: string;
};

type PartnerSummary = {
  userId: number;
  brandName: string;
  address: string;
};

type BookingQuote = {
  photographerUserId: number;
  brandName: string;
  photographerAddress: string;
  eventAddress: string;
  eventLatitude: number;
  eventLongitude: number;
  packageId: number;
  packageName: string;
  packagePrice: number;
  distanceKm: number;
  freeDistanceKm: number;
  transportFeePerKm: number;
  transportFee: number;
  totalPrice: number;
  amount: number;
};

type TimeSlotAvailabilitySummary = {
  time: string;
  status: "available" | "limited" | "full" | "blocked";
  activeBookings: number;
  teamQuota: number;
  remainingQuota: number;
};

type InputProps = {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  min?: string;
  max?: string;
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
  optionLabels?: Record<string, string>;
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

type AddressSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type AuthMeResponse = {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
  };
  message?: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseCoordinateInput(value: string, min: number, max: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
    return null;
  }

  return numericValue;
}

function getTimeSlotErrorMessage(slot?: TimeSlotAvailabilitySummary | null) {
  if (!slot) {
    return null;
  }

  if (slot.status === "blocked") {
    return "Slot ditutup oleh partner.";
  }

  if (slot.status === "full") {
    return "Kuota pada jam ini sudah penuh.";
  }

  return null;
}

function getTimeSlotLabel(slot: TimeSlotAvailabilitySummary) {
  if (slot.status === "blocked") {
    return "Ditutup";
  }

  if (slot.status === "full") {
    return "Penuh";
  }

  if (slot.status === "limited") {
    return `Sisa ${slot.remainingQuota} slot`;
  }

  return `${slot.remainingQuota} slot tersedia`;
}

export default function BookingForm() {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    phone: "",
    package: "" as string | number,
    date: "",
    time: "",
    eventAddress: "",
    eventLatitude: "",
    eventLongitude: "",
    note: "",
  });
  const [packages, setPackages] = useState<PartnerPackage[]>([]);
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [timeSlotSummaries, setTimeSlotSummaries] = useState<
    TimeSlotAvailabilitySummary[]
  >([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<PaymentFeedback | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const hasEditedNameRef = useRef(false);

  const searchParams = useSearchParams();
  const fgId = searchParams.get("fg");
  const packageParam = searchParams.get("package");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    let ignore = false;

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json().catch(() => null)) as
          | AuthMeResponse
          | null;
        const userName = data?.user?.name?.trim();

        if (!ignore && userName) {
          setForm((prev) => {
            const nextPhone = data?.user?.phone?.trim() || "";

            if (
              (hasEditedNameRef.current || prev.name.trim()) &&
              prev.phone.trim()
            ) {
              return prev;
            }

            return {
              ...prev,
              name:
                hasEditedNameRef.current || prev.name.trim()
                  ? prev.name
                  : userName,
              phone: prev.phone.trim() || nextPhone,
            };
          });
        }
      } catch {
        // Biarkan form tetap manual jika user belum login atau request gagal.
      }
    };

    void fetchCurrentUser();

    return () => {
      ignore = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!fgId) {
      setLoading(false);
      setError("Tidak ada fotografer yang dipilih. Silakan kembali ke halaman FindFG.");
      return;
    }

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/packages/${fgId}`, {
          cache: "no-store",
        });

        const data = (await res.json().catch(() => null)) as
          | {
              message?: string;
              partner?: PartnerSummary | null;
              packages?: PartnerPackage[];
            }
          | null;

        if (!res.ok) {
          throw new Error(data?.message || `API error: ${res.status}`);
        }

        const nextPackages = data?.packages ?? [];
        const selectedPackageId = Number(packageParam);
        const hasRequestedPackage = nextPackages.some(
          (item) => item.id === selectedPackageId
        );

        setPartner(data?.partner ?? null);
        setPackages(nextPackages);
        setForm((prev) => ({
          ...prev,
          package:
            hasRequestedPackage && selectedPackageId > 0
              ? selectedPackageId
              : nextPackages[0]?.id ?? "",
        }));

        if (nextPackages.length === 0) {
          setError("Fotografer ini belum memiliki paket aktif.");
        }
      } catch (err) {
        console.error("Error fetching packages:", err);
        setError(err instanceof Error ? err.message : "Gagal memuat data paket.");
        setPartner(null);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchPackages();
  }, [fgId, mounted, packageParam]);

  useEffect(() => {
    if (!mounted || !fgId || !form.date) {
      setUnavailableTimes([]);
      setTimeSlotSummaries([]);
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
          | {
              message?: string;
              unavailableTimes?: string[];
              timeSlots?: TimeSlotAvailabilitySummary[];
            }
          | null;

        if (!response.ok) {
          throw new Error(
            data?.message || "Gagal memuat jadwal yang sudah terisi."
          );
        }

        if (!ignore) {
          const nextUnavailable = data?.unavailableTimes ?? [];
          const nextSummaries = Array.isArray(data?.timeSlots) ? data.timeSlots : [];
          setUnavailableTimes(nextUnavailable);
          setTimeSlotSummaries(nextSummaries);

          const currentSlot =
            nextSummaries.find((item) => item.time === currentTime) ?? null;

          if (currentTime && nextUnavailable.includes(currentTime)) {
            setTimeError(getTimeSlotErrorMessage(currentSlot) || "Sudah terbooking");
          } else {
            setTimeError(null);
          }
        }
      } catch (err) {
        if (!ignore) {
          setUnavailableTimes([]);
          setTimeSlotSummaries([]);
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

  const selectedPackage = useMemo(() => {
    return packages.find((item) => item.id === Number(form.package)) ?? null;
  }, [form.package, packages]);

  const slotSummaryMap = useMemo(() => {
    return Object.fromEntries(timeSlotSummaries.map((item) => [item.time, item]));
  }, [timeSlotSummaries]);

  const slotOptionLabels = useMemo(() => {
    return Object.fromEntries(
      BOOKING_TIME_SLOTS.map((time) => {
        const slot = slotSummaryMap[time];

        if (!slot) {
          return [time, time];
        }

        return [time, `${time} - ${getTimeSlotLabel(slot)}`];
      })
    ) as Record<string, string>;
  }, [slotSummaryMap]);

  useEffect(() => {
    if (!mounted || !fgId || !selectedPackage) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    const eventAddress = form.eventAddress.trim();

    if (!eventAddress || !form.eventLatitude || !form.eventLongitude) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    const eventLatitude = parseCoordinateInput(form.eventLatitude, -90, 90);
    const eventLongitude = parseCoordinateInput(form.eventLongitude, -180, 180);

    if (eventLatitude === null || eventLongitude === null) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError("Latitude atau longitude acara tidak valid.");
      return;
    }

    let ignore = false;
    setQuote(null);
    setQuoteLoading(true);
    setQuoteError(null);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/booking-quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photographerId: Number(fgId),
            packageId: selectedPackage.id,
            eventAddress,
            eventLatitude,
            eventLongitude,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { message?: string; quote?: BookingQuote }
          | null;

        if (!response.ok || !data?.quote) {
          throw new Error(
            data?.message || "Gagal menghitung rincian pembayaran."
          );
        }

        if (!ignore) {
          setQuote(data.quote);
          setQuoteError(null);
        }
      } catch (err) {
        if (!ignore) {
          setQuote(null);
          setQuoteError(
            err instanceof Error
              ? err.message
              : "Gagal menghitung rincian pembayaran."
          );
        }
      } finally {
        if (!ignore) {
          setQuoteLoading(false);
        }
      }
    }, 450);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    fgId,
    form.eventAddress,
    form.eventLatitude,
    form.eventLongitude,
    mounted,
    selectedPackage,
  ]);

  const update = (key: keyof BookingFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (value: string) => {
    update("time", value);
    setTimeError(
      unavailableTimes.includes(value)
        ? getTimeSlotErrorMessage(slotSummaryMap[value]) || "Sudah terbooking"
        : null
    );
  };

  const handleNameChange = (value: string) => {
    hasEditedNameRef.current = true;
    update("name", value);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setQuoteError("Browser ini tidak mendukung geolocation.");
      return;
    }

    setGeoLoading(true);
    setQuoteError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          eventLatitude: position.coords.latitude.toFixed(8),
          eventLongitude: position.coords.longitude.toFixed(8),
        }));
        setGeoLoading(false);
      },
      (geoError) => {
        setQuoteError(
          geoError.message || "Gagal mengambil koordinat lokasi saat ini."
        );
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const handleMapCoordinateChange = (latitude: string, longitude: string) => {
    setForm((prev) => ({
      ...prev,
      eventLatitude: latitude,
      eventLongitude: longitude,
    }));
    setQuoteError(null);
  };

  const handleSearchAddress = async () => {
    const query = form.eventAddress.trim();

    if (!query) {
      setAddressSearchError("Masukkan alamat terlebih dahulu sebelum mencari.");
      setAddressResults([]);
      return;
    }

    setAddressSearchLoading(true);
    setAddressSearchError(null);
    setAddressResults([]);

    try {
      const searchParams = new URLSearchParams({
        q: query,
        format: "jsonv2",
        limit: "5",
        addressdetails: "1",
        countrycodes: "id",
        "accept-language": "id",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Layanan pencarian alamat sedang tidak tersedia.");
      }

      const results = (await response.json()) as AddressSearchResult[];

      if (!Array.isArray(results) || results.length === 0) {
        setAddressSearchError("Alamat tidak ditemukan. Coba kata kunci yang lebih spesifik.");
        return;
      }

      setAddressResults(results);
    } catch (searchError) {
      setAddressSearchError(
        searchError instanceof Error
          ? searchError.message
          : "Gagal mencari alamat."
      );
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const handleSelectAddressResult = (result: AddressSearchResult) => {
    setForm((prev) => ({
      ...prev,
      eventAddress: result.display_name,
      eventLatitude: Number(result.lat).toFixed(8),
      eventLongitude: Number(result.lon).toFixed(8),
    }));
    setAddressResults([]);
    setAddressSearchError(null);
    setQuoteError(null);
  };

  const handlePayment = async () => {
    setPaymentFeedback(null);

    if (!form.name || !form.phone) {
      setPaymentFeedback({
        tone: "error",
        message: "Nama lengkap dan nomor WhatsApp wajib diisi.",
      });
      return;
    }

    if (!form.date || !form.time) {
      setPaymentFeedback({
        tone: "error",
        message: "Tanggal dan jam booking wajib dipilih.",
      });
      return;
    }

    if (!selectedPackage) {
      setPaymentFeedback({
        tone: "error",
        message: "Pilih paket terlebih dahulu.",
      });
      return;
    }

    if (!form.eventAddress.trim()) {
      setPaymentFeedback({
        tone: "error",
        message: "Alamat acara wajib diisi.",
      });
      return;
    }

    if (!form.eventLatitude || !form.eventLongitude) {
      setPaymentFeedback({
        tone: "error",
        message: "Latitude dan longitude acara wajib diisi.",
      });
      return;
    }

    if (quoteLoading) {
      setPaymentFeedback({
        tone: "warning",
        message: "Tunggu sampai rincian pembayaran selesai dihitung.",
      });
      return;
    }

    if (!quote) {
      setPaymentFeedback({
        tone: "error",
        message:
          quoteError ||
          "Rincian pembayaran belum tersedia. Periksa alamat dan koordinat acara.",
      });
      return;
    }

    if (unavailableTimes.includes(form.time)) {
      setTimeError(getTimeSlotErrorMessage(slotSummaryMap[form.time]) || "Sudah terbooking");
      setPaymentFeedback({
        tone: "error",
        message: "Jam yang dipilih sudah tidak tersedia.",
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
          amount: quote.totalPrice,
          packageId: selectedPackage.id,
          photographerId: Number(fgId),
          date: form.date,
          time: form.time,
          eventAddress: form.eventAddress,
          eventLatitude: Number(form.eventLatitude),
          eventLongitude: Number(form.eventLongitude),
          note: form.note,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string; token?: string }
        | null;

        if (!res.ok) {
          if (res.status === 409) {
            setTimeError(
              getTimeSlotErrorMessage(slotSummaryMap[form.time]) ||
                "Kuota pada jam ini sudah penuh."
            );
          }
          setPaymentFeedback({
            tone: "error",
          message: data?.error || "Gagal membuat transaksi pembayaran.",
        });
        return;
      }

      if (!data?.token) {
        setPaymentFeedback({
          tone: "error",
          message: "Token pembayaran tidak tersedia.",
        });
        return;
      }

      if (typeof window.snap?.pay !== "function") {
        setPaymentFeedback({
          tone: "error",
          message: "Popup pembayaran belum siap. Coba beberapa saat lagi.",
        });
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: function () {
          setPaymentFeedback({
            tone: "success",
            message:
              "Booking berhasil dibuat dan pembayaran sukses. Status booking akan diperbarui otomatis.",
          });
        },
        onPending: function () {
          setPaymentFeedback({
            tone: "warning",
            message:
              "Booking sudah dibuat. Pembayaran masih menunggu penyelesaian dari Anda.",
          });
        },
        onError: function () {
          setPaymentFeedback({
            tone: "error",
            message:
              "Pembayaran gagal diproses. Booking tetap tercatat dan status akhirnya menunggu update dari Midtrans.",
          });
        },
        onClose: function () {
          setPaymentFeedback({
            tone: "warning",
            message:
              "Popup pembayaran ditutup. Booking tetap dibuat dan menunggu status pembayaran berikutnya.",
          });
        },
      });
    } catch (error) {
      setPaymentFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal memulai proses pembayaran.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <section
      data-navbar-tone="dark"
      className="min-h-screen bg-white px-6 py-10 font-[NeueHaas] text-black md:px-20"
    >
      <div className="mb-12 mt-10">
        <h1 className="text-[24px] font-normal leading-tight md:text-[40px]">
          Form Booking
        </h1>

        <p className="mt-2 max-w-2xl text-[18px] md:text-[20px]">
          Pilih paket, isi alamat acara beserta titik koordinatnya, lalu sistem
          akan menghitung biaya transport sebelum pembayaran dikonfirmasi.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_420px]">
        <div className="space-y-6 text-[18px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              placeholder="Your name"
              value={form.name}
              onChange={handleNameChange}
            />
            <Input
              label="WhatsApp Number"
              placeholder="08xxxx"
              value={form.phone}
              onChange={(value) => update("phone", value)}
            />
          </div>

          <div>
            <p className="mb-3">Select Package</p>

            {error && (
              <p className="mb-3 text-sm text-red-500">{error}</p>
            )}

            {loading && (
              <p className="text-sm text-gray-400">Loading packages...</p>
            )}

            {!loading && packages.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {packages.map((item) => {
                  const active = Number(form.package) === Number(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => update("package", Number(item.id))}
                      className={`rounded-md border p-4 text-left transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-black"
                      }`}
                    >
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-sm">{item.duration}</p>
                      <p className="mt-2 text-sm">
                        {formatCurrency(Number(item.price))}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && packages.length === 0 && !error && (
              <p className="mt-2 text-sm text-gray-400">
                No packages available for this photographer.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Date"
              value={form.date}
              onChange={(value) => update("date", value)}
            />

            <Select
              label="Time"
              options={BOOKING_TIME_SLOTS}
              value={form.time}
              onChange={handleTimeChange}
              disabledOptions={unavailableTimes}
              optionLabels={slotOptionLabels}
              error={timeError}
            />
          </div>

          {form.date && (
            <div className="space-y-4 text-sm text-gray-500">
              {availabilityLoading && <p>Checking availability...</p>}
              {!availabilityLoading && availabilityError && (
                <p className="text-red-500">{availabilityError}</p>
              )}
              {!availabilityLoading &&
                !availabilityError &&
                timeSlotSummaries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                        Tersedia
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                        Hampir penuh
                      </span>
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                        Penuh
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        Ditutup partner
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {timeSlotSummaries.map((slot) => {
                        const isSelected = form.time === slot.time;
                        const isDisabled =
                          slot.status === "blocked" || slot.status === "full";

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleTimeChange(slot.time)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-black bg-black text-white"
                                : slot.status === "available"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                                  : slot.status === "limited"
                                    ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
                                    : slot.status === "blocked"
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                                      : "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-600"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-base font-medium">{slot.time}</span>
                              <span className="text-[11px] uppercase tracking-[0.12em]">
                                {slot.status === "available"
                                  ? "Open"
                                  : slot.status === "limited"
                                    ? "Limited"
                                    : slot.status === "blocked"
                                      ? "Closed"
                                      : "Full"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm">
                              {getTimeSlotLabel(slot)}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              {slot.status === "blocked"
                                ? "Partner menutup slot ini secara manual."
                                : `${slot.activeBookings}/${slot.teamQuota} booking aktif`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

          <Textarea
            label="Event Address"
            value={form.eventAddress}
            onChange={(value) => {
              update("eventAddress", value);
              if (addressSearchError) {
                setAddressSearchError(null);
              }
            }}
          />

          <div className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#fcfbf8_0%,#f3ede6_100%)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <p className="mb-2 text-sm">Cari alamat di peta</p>
                <input
                  type="text"
                  value={form.eventAddress}
                  onChange={(event) => {
                    update("eventAddress", event.target.value);
                    if (addressSearchError) {
                      setAddressSearchError(null);
                    }
                  }}
                  placeholder="Contoh: Gedung Sate Bandung"
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchAddress}
                disabled={addressSearchLoading}
                className="rounded-md bg-black px-5 py-3 text-sm text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addressSearchLoading ? "Mencari..." : "Cari alamat"}
              </button>
            </div>

            <p className="mt-3 text-sm text-black/60">
              Ketik alamat atau nama tempat, lalu pilih hasil yang paling sesuai
              untuk memindahkan pin secara otomatis.
            </p>

            {addressSearchError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addressSearchError}
              </div>
            )}

            {addressResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {addressResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleSelectAddressResult(result)}
                    className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:border-black hover:bg-black/[0.02]"
                  >
                    <p className="text-sm font-medium text-black">Pilih lokasi ini</p>
                    <p className="mt-1 text-sm leading-6 text-black/70">
                      {result.display_name}
                    </p>
                    <p className="mt-2 text-[12px] uppercase tracking-[0.12em] text-black/40">
                      {Number(result.lat).toFixed(5)}, {Number(result.lon).toFixed(5)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <BookingLocationMap
            latitude={form.eventLatitude}
            longitude={form.eventLongitude}
            onChange={handleMapCoordinateChange}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Event Latitude"
              placeholder="-6.20000000"
              value={form.eventLatitude}
              onChange={(value) => update("eventLatitude", value)}
              step="0.00000001"
              min="-90"
              max="90"
            />
            <Input
              type="number"
              label="Event Longitude"
              placeholder="106.81666600"
              value={form.eventLongitude}
              onChange={(value) => update("eventLongitude", value)}
              step="0.00000001"
              min="-180"
              max="180"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="rounded-md border border-black px-4 py-2 text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {geoLoading ? "Mengambil lokasi..." : "Gunakan lokasi saya"}
            </button>
            <p className="text-black/60">
              Klik peta, geser pin, atau gunakan lokasi perangkat untuk mengisi
              koordinat acara.
            </p>
          </div>

          {(quoteLoading || quoteError) && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                quoteError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {quoteError || "Menghitung rincian pembayaran..."}
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

          <Textarea
            label="Notes (optional)"
            value={form.note}
            onChange={(value) => update("note", value)}
          />

          <button
            type="button"
            onClick={handlePayment}
            disabled={
              loading ||
              submitLoading ||
              quoteLoading ||
              !selectedPackage ||
              !fgId ||
              !mounted ||
              !quote
            }
            className={`rounded-md px-6 py-3 text-white ${
              loading ||
              submitLoading ||
              quoteLoading ||
              !selectedPackage ||
              !fgId ||
              !mounted ||
              !quote
                ? "cursor-not-allowed bg-gray-400"
                : "cursor-pointer bg-black"
            }`}
          >
            {submitLoading
              ? "Processing..."
              : quoteLoading
                ? "Menghitung total..."
                : "Pay & Book"}
          </button>
        </div>

        <div className="h-fit rounded-md border border-gray-200 p-6">
          <p className="mb-4 text-[18px] font-medium">Checkout Summary</p>

          <div className="space-y-3 text-sm">
            <Row
              label="Photographer"
              value={quote?.brandName || partner?.brandName || "-"}
            />
            <Row
              label="Photographer Address"
              value={quote?.photographerAddress || partner?.address || "-"}
            />
            <Row label="Package" value={selectedPackage?.name || "-"} />
            <Row label="Duration" value={selectedPackage?.duration || "-"} />
            <Row label="Event Address" value={form.eventAddress || "-"} />
            <Row
              label="Event Point"
              value={
                form.eventLatitude && form.eventLongitude
                  ? `${form.eventLatitude}, ${form.eventLongitude}`
                  : "-"
              }
            />
            <Row label="Date" value={form.date || "-"} />
            <Row label="Time" value={form.time || "-"} />
            <div className="mt-3 border-t border-gray-200 pt-3">
              <Row
                label="Package Price"
                value={
                  quote
                    ? formatCurrency(quote.packagePrice)
                    : selectedPackage
                      ? formatCurrency(Number(selectedPackage.price))
                      : "-"
                }
              />
              <Row
                label="Distance"
                value={quote ? `${quote.distanceKm.toFixed(2)} km` : "-"}
              />
              <Row
                label="Transport Fee"
                value={quote ? formatCurrency(quote.transportFee) : "-"}
              />
              <Row
                label="Total Payment"
                value={quote ? formatCurrency(quote.totalPrice) : "-"}
              />
            </div>

            {quote && (
              <div className="rounded-md bg-black/[0.03] px-4 py-3 text-[13px] text-black/70">
                Gratis transport {quote.freeDistanceKm.toFixed(2)} km. Tarif
                setelahnya {formatCurrency(quote.transportFeePerKm)}/km.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  step,
  min,
  max,
}: InputProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[120px] w-full rounded-md border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
  optionLabels = {},
  error = null,
}: SelectProps) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-md border px-4 py-3 outline-none ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-gray-300 focus:border-black"
        }`}
      >
        <option value="">Select time</option>
        {options.map((option) => (
          <option
            key={option}
            value={option}
            disabled={disabledOptions.includes(option)}
          >
            {optionLabels[option] ||
              (disabledOptions.includes(option)
                ? `${option} - Sudah terbooking`
                : option)}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
