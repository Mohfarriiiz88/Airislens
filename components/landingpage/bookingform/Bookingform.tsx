"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import LoginRequiredModal from "@/components/ui/LoginRequiredModal";

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
  category: string | number;
  package: string | number;
  date: string;
  time: string;
  eventAddress: string;
  eventLatitude: string;
  eventLongitude: string;
  note: string;
};

type PartnerCategory = {
  id: number;
  name: string;
  slug: string;
};

type PartnerPackage = {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
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
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  packageId: number;
  packageName: string;
  packagePrice: number;
  distanceKm: number;
  freeDistanceKm: number;
  flatTransportFee: number;
  transportFee: number;
  serviceFeeRate: number;
  serviceFee: number;
  photographerPayoutAmount: number;
  totalPrice: number;
  amount: number;
};

type TimeSlotAvailabilitySummary = {
  time: string;
  endTime: string;
  rangeLabel: string;
  status:
    | "available"
    | "full"
    | "closed"
    | "conflict"
    | "outside_working_hours";
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

function formatDistanceKm(distanceKm: number) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(distanceKm);
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

  if (slot.status === "closed") {
    return "Slot ditutup oleh partner.";
  }

  if (slot.status === "full") {
    return "Kuota pada rentang waktu ini sudah penuh.";
  }

  if (slot.status === "outside_working_hours") {
    return "Rentang waktu ini melewati jam kerja partner.";
  }

  if (slot.status === "conflict") {
    return "Rentang waktu ini bentrok dengan jadwal lain.";
  }

  return null;
}

function getTimeSlotLabel(slot: TimeSlotAvailabilitySummary) {
  if (slot.status === "closed") {
    return "Ditutup partner";
  }

  if (slot.status === "full") {
    return "Penuh";
  }

  if (slot.status === "outside_working_hours") {
    return "Di luar jam kerja";
  }

  if (slot.status === "conflict") {
    return "Bentrok";
  }

  if (slot.activeBookings > 0) {
    return `Sisa ${slot.remainingQuota} slot`;
  }

  return `${slot.remainingQuota} slot tersedia`;
}

export default function BookingForm({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    phone: "",
    category: "" as string | number,
    package: "" as string | number,
    date: "",
    time: "",
    eventAddress: "",
    eventLatitude: "",
    eventLongitude: "",
    note: "",
  });
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!isAuthenticated);
  const hasEditedNameRef = useRef(false);

  const searchParams = useSearchParams();
  const photographerIdParam =
    searchParams.get("photographerId") ?? searchParams.get("fg");
  const categoryParam = searchParams.get("categoryId");
  const packageParam = searchParams.get("packageId") ?? searchParams.get("package");
  const bookingQueryString = searchParams.toString();
  const loginRedirectTarget = bookingQueryString
    ? `/bookingform?${bookingQueryString}`
    : "/bookingform";
  const loginHref = `/login?next=${encodeURIComponent(loginRedirectTarget)}`;
  const loginDescription =
    "Please log in first to continue booking. Once logged in, you'll be returned to this form and can complete your booking without having to start over.";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
    }
  }, [bookingQueryString, isAuthenticated]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) {
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
  }, [isAuthenticated, mounted]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) {
      return;
    }

    if (!photographerIdParam) {
      setLoading(false);
      setError("Tidak ada fotografer yang dipilih. Silakan kembali ke halaman FindFG.");
      return;
    }

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/packages/${photographerIdParam}`, {
          cache: "no-store",
        });

        const data = (await res.json().catch(() => null)) as
          | {
              message?: string;
              partner?: PartnerSummary | null;
              categories?: PartnerCategory[];
              packages?: PartnerPackage[];
            }
          | null;

        if (!res.ok) {
          throw new Error(data?.message || `API error: ${res.status}`);
        }

        const nextCategories = data?.categories ?? [];
        const nextPackages = data?.packages ?? [];
        const requestedCategoryId = Number(categoryParam);
        const selectedPackageId = Number(packageParam);
        const requestedPackage =
          nextPackages.find((item) => item.id === selectedPackageId) ?? null;
        const hasRequestedCategory = nextCategories.some(
          (item) => item.id === requestedCategoryId
        );
        const nextCategoryId =
          requestedPackage?.categoryId ??
          (hasRequestedCategory ? requestedCategoryId : nextCategories[0]?.id ?? "");

        setPartner(data?.partner ?? null);
        setCategories(nextCategories);
        setPackages(nextPackages);
        setForm((prev) => ({
          ...prev,
          category: nextCategoryId,
          time: "",
          package:
            requestedPackage &&
            requestedPackage.categoryId !== null &&
            requestedPackage.categoryId === nextCategoryId
              ? selectedPackageId
              : "",
        }));

        if (nextCategories.length === 0) {
          setError("Fotografer ini belum memiliki kategori layanan aktif.");
        } else if (nextPackages.length === 0) {
          setError("Fotografer ini belum memiliki paket aktif.");
        }
      } catch (err) {
        console.error("Error fetching packages:", err);
        setError(err instanceof Error ? err.message : "Gagal memuat data paket.");
        setPartner(null);
        setCategories([]);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchPackages();
  }, [categoryParam, isAuthenticated, mounted, packageParam, photographerIdParam]);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => item.id === Number(form.category)) ?? null;
  }, [categories, form.category]);
  const visiblePackages = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return packages.filter((item) => item.categoryId === selectedCategory.id);
  }, [packages, selectedCategory]);
  const selectedPackage = useMemo(() => {
    return packages.find((item) => item.id === Number(form.package)) ?? null;
  }, [form.package, packages]);

  useEffect(() => {
    if (
      !mounted ||
      !isAuthenticated ||
      !photographerIdParam ||
      !selectedPackage ||
      !form.date
    ) {
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
          `/api/availability?photographerId=${encodeURIComponent(photographerIdParam)}&packageId=${encodeURIComponent(selectedPackage.id)}&date=${encodeURIComponent(form.date)}`,
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
  }, [
    form.date,
    form.time,
    isAuthenticated,
    mounted,
    photographerIdParam,
    selectedPackage,
  ]);

  const slotSummaryMap = useMemo(() => {
    return Object.fromEntries(timeSlotSummaries.map((item) => [item.time, item]));
  }, [timeSlotSummaries]);
  const timeSlotOptions = useMemo(
    () => timeSlotSummaries.map((item) => item.time),
    [timeSlotSummaries]
  );

  const slotOptionLabels = useMemo(() => {
    return Object.fromEntries(
      timeSlotSummaries.map((summary) => {
        const time = summary.time;
        const currentSlot = slotSummaryMap[time];

        if (!currentSlot) {
          return [time, time];
        }

        return [
          time,
          `${currentSlot.rangeLabel} - ${getTimeSlotLabel(currentSlot)}`,
        ];
      })
    ) as Record<string, string>;
  }, [slotSummaryMap, timeSlotSummaries]);
  const selectedTimeSlot = useMemo(
    () => slotSummaryMap[form.time] ?? null,
    [form.time, slotSummaryMap]
  );

  useEffect(() => {
    if (
      !mounted ||
      !isAuthenticated ||
      !photographerIdParam ||
      !selectedCategory ||
      !selectedPackage
    ) {
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
            photographerId: Number(photographerIdParam),
            categoryId: selectedCategory.id,
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
    form.eventAddress,
    form.eventLatitude,
    form.eventLongitude,
    isAuthenticated,
    mounted,
    photographerIdParam,
    selectedCategory,
    selectedPackage,
  ]);

  const update = (key: keyof BookingFormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (value: string) => {
    update("time", value);
    const slot = slotSummaryMap[value];
    setTimeError(
      slot && slot.status !== "available"
        ? getTimeSlotErrorMessage(slot) || "Jadwal tidak tersedia."
        : null
    );
  };

  const handleNameChange = (value: string) => {
    hasEditedNameRef.current = true;
    update("name", value);
  };

  const handleCategoryChange = (value: number) => {
    setForm((prev) => ({
      ...prev,
      category: value,
      package: "",
      time: "",
    }));
    setUnavailableTimes([]);
    setTimeSlotSummaries([]);
    setTimeError(null);
    setQuote(null);
    setQuoteError(null);
    setPaymentFeedback(null);
  };

  const handlePackageChange = (value: number) => {
    setForm((prev) => ({
      ...prev,
      package: value,
      time: "",
    }));
    setTimeError(null);
    setQuote(null);
    setQuoteError(null);
    setPaymentFeedback(null);
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

    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

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
        message: "Tanggal dan jam mulai booking wajib dipilih.",
      });
      return;
    }

    if (!selectedCategory) {
      setPaymentFeedback({
        tone: "error",
        message: "Pilih kategori layanan terlebih dahulu.",
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
      setTimeError(
        getTimeSlotErrorMessage(slotSummaryMap[form.time]) ||
          "Jadwal tidak tersedia."
      );
      setPaymentFeedback({
        tone: "error",
        message: "Jam mulai yang dipilih sudah tidak tersedia.",
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
          categoryId: selectedCategory.id,
          packageId: selectedPackage.id,
          photographerId: Number(photographerIdParam),
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
          if (res.status === 401) {
            setIsLoginModalOpen(true);
          }
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

  if (!isAuthenticated) {
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
            Login diperlukan sebelum Anda bisa memilih paket dan menyelesaikan
            booking di AIRISLENS.
          </p>
        </div>

        <div className="max-w-2xl rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,#fcfbf8_0%,#f2ece4_100%)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
            Akses booking dibatasi
          </p>

          <h2 className="mt-3 text-[28px] leading-tight md:text-[34px]">
            Masuk ke akun Anda sebelum melanjutkan pemesanan.
          </h2>

          <p className="mt-4 text-[17px] leading-8 text-black/70">
            Sistem booking AIRISLENS hanya bisa diproses untuk pengguna yang
            sudah login, sehingga data paket, pembayaran, dan riwayat booking
            tetap terhubung ke akun yang benar.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center rounded-full bg-black px-6 py-3 text-[16px] text-white transition hover:bg-black/85"
            >
              Login sekarang
            </Link>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center rounded-full border border-black px-6 py-3 text-[16px] text-black transition hover:bg-black hover:text-white"
            >
              Tampilkan pop up lagi
            </button>
          </div>
        </div>

        <LoginRequiredModal
          open={isLoginModalOpen}
          loginHref={loginHref}
          description={loginDescription}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </section>
    );
  }

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
          Isi data pemesan terlebih dahulu, lalu pilih kategori layanan, paket,
          dan detail acara sampai sistem menghitung total biaya booking secara
          otomatis.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_420px]">
        <div className="space-y-6 text-[18px]">
          <div>
            <p className="mb-3">1. Data Pemesan</p>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nama Pemesan"
                placeholder="Nama lengkap"
                value={form.name}
                onChange={handleNameChange}
              />
              <Input
                label="Nomor WhatsApp"
                placeholder="08xxxx"
                value={form.phone}
                onChange={(value) => update("phone", value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-3">2. Pilih Kategori Layanan</p>

            {error && (
              <p className="mb-3 text-sm text-red-500">{error}</p>
            )}

            {loading && (
              <p className="text-sm text-gray-400">
                Memuat kategori dan paket...
              </p>
            )}

            {!loading && categories.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {categories.map((item) => {
                  const active = Number(form.category) === Number(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategoryChange(Number(item.id))}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black hover:border-black"
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && categories.length === 0 && !error && (
              <p className="mt-2 text-sm text-gray-400">
                Fotografer ini belum memiliki kategori layanan.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-black/10 bg-[#faf7f2] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                Kategori aktif
              </p>
              <p className="mt-2 text-[22px] text-black">
                {selectedCategory?.name || "-"}
              </p>
            </div>

            <div className="rounded-[24px] border border-black/10 bg-[#faf7f2] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                Paket terpilih
              </p>
              <p className="mt-2 text-[22px] text-black">
                {selectedPackage?.name || "Belum dipilih"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3">3. Pilih Paket</p>

            {!loading && selectedCategory && visiblePackages.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {visiblePackages.map((item) => {
                  const active = Number(form.package) === Number(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePackageChange(Number(item.id))}
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

            {!loading && selectedCategory && visiblePackages.length === 0 && !error && (
              <p className="mt-2 text-sm text-gray-400">
                Belum ada paket pada kategori {selectedCategory.name}.
              </p>
            )}

            {!loading && !selectedCategory && categories.length > 0 && (
              <p className="mt-2 text-sm text-gray-400">
                Pilih kategori terlebih dahulu untuk melihat paket yang tersedia.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="4. Tanggal"
              value={form.date}
              onChange={(value) => update("date", value)}
            />

            <Select
              label="4. Jam Mulai"
              options={timeSlotOptions}
              value={form.time}
              onChange={handleTimeChange}
              disabledOptions={unavailableTimes}
              optionLabels={slotOptionLabels}
              error={timeError}
            />
          </div>

          {!selectedPackage && form.date && (
            <p className="text-sm text-gray-400">
              Pilih paket terlebih dahulu agar sistem menampilkan slot jam mulai
              sesuai durasi paket.
            </p>
          )}

          {selectedPackage && form.date && (
            <div className="space-y-4 text-sm text-gray-500">
              {availabilityLoading && <p>Memeriksa ketersediaan jadwal...</p>}
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
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                        Penuh
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                        Ditutup partner
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                        Di luar jam kerja
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {timeSlotSummaries.map((slot) => {
                        const isSelected = form.time === slot.time;
                        const isDisabled = slot.status !== "available";

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
                                  : slot.status === "closed"
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                                      : slot.status === "outside_working_hours"
                                        ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700"
                                        : "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-600"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-base font-medium">
                                {slot.rangeLabel}
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.12em]">
                                {slot.status === "available"
                                  ? "Open"
                                  : slot.status === "closed"
                                      ? "Closed"
                                      : slot.status === "outside_working_hours"
                                        ? "Outside"
                                        : "Full"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm">
                              {getTimeSlotLabel(slot)}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              {slot.status === "closed"
                                ? "Partner menutup slot ini secara manual."
                                : slot.status === "outside_working_hours"
                                  ? "Rentang sesi melewati batas jam kerja partner."
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
            label="5. Lokasi Pemotretan"
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
            label="6. Catatan (opsional)"
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
              !selectedCategory ||
              !selectedPackage ||
              !photographerIdParam ||
              !mounted ||
              !quote
            }
            className={`rounded-md px-6 py-3 text-white ${
              loading ||
              submitLoading ||
              quoteLoading ||
              !selectedCategory ||
              !selectedPackage ||
              !photographerIdParam ||
              !mounted ||
              !quote
                ? "cursor-not-allowed bg-gray-400"
                : "cursor-pointer bg-black"
            }`}
          >
            {submitLoading
              ? "Memproses..."
              : quoteLoading
                ? "Menghitung total..."
                : "Bayar & Booking"}
          </button>
        </div>

        <div className="h-fit rounded-md border border-gray-200 p-6">
          <p className="mb-4 text-[18px] font-medium">Ringkasan Pembayaran</p>

          <div className="space-y-3 text-sm">
            <Row
              label="Fotografer"
              value={quote?.brandName || partner?.brandName || "-"}
            />
            <Row
              label="Alamat Fotografer"
              value={quote?.photographerAddress || partner?.address || "-"}
            />
            <Row
              label="Kategori Layanan"
              value={selectedCategory?.name || quote?.categoryName || "-"}
            />
            <Row label="Paket Layanan" value={selectedPackage?.name || "-"} />
            <Row label="Durasi" value={selectedPackage?.duration || "-"} />
            <Row label="Alamat Acara" value={form.eventAddress || "-"} />
            <Row
              label="Titik Acara"
              value={
                form.eventLatitude && form.eventLongitude
                  ? `${form.eventLatitude}, ${form.eventLongitude}`
                  : "-"
              }
            />
            <Row label="Tanggal" value={form.date || "-"} />
            <Row
              label="Jam Mulai"
              value={
                selectedTimeSlot?.rangeLabel || form.time || "-"
              }
            />
            <div className="mt-3 border-t border-gray-200 pt-3">
              <Row
                label="Harga Paket"
                value={
                  quote
                    ? formatCurrency(quote.packagePrice)
                    : selectedPackage
                      ? formatCurrency(Number(selectedPackage.price))
                      : "-"
                }
              />
              <Row
                label="Jarak Lokasi"
                value={quote ? `${formatDistanceKm(quote.distanceKm)} km` : "-"}
              />
              <Row
                label="Batas Gratis Transportasi"
                value={
                  quote ? `${formatDistanceKm(quote.freeDistanceKm)} km` : "-"
                }
              />
              <Row
                label="Biaya Transportasi"
                value={quote ? formatCurrency(quote.transportFee) : "-"}
              />
              <Row
                label={
                  quote
                    ? `Biaya Layanan ${quote.serviceFeeRate}%`
                    : "Biaya Layanan"
                }
                value={quote ? formatCurrency(quote.serviceFee) : "-"}
              />
              <Row
                label="Total Pembayaran"
                value={quote ? formatCurrency(quote.totalPrice) : "-"}
              />
            </div>

            {quote && (
              <div className="rounded-md bg-black/[0.03] px-4 py-3 text-[13px] text-black/70">
                {quote.distanceKm <= quote.freeDistanceKm
                  ? `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini masih dalam batas gratis.`
                  : quote.flatTransportFee > 0
                    ? `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini melewati batas gratis sehingga dikenakan biaya transportasi tetap ${formatCurrency(quote.flatTransportFee)}.`
                    : `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini melewati batas gratis, tetapi partner tidak mengenakan biaya transportasi tambahan.`}
              </div>
            )}
          </div>
        </div>
      </div>

      <LoginRequiredModal
        open={isLoginModalOpen}
        loginHref={loginHref}
        description={loginDescription}
        onClose={() => setIsLoginModalOpen(false)}
      />
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
