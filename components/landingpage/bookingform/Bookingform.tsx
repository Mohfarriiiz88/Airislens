"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import LoginRequiredModal from "@/components/ui/LoginRequiredModal";
import { getBookingLifecycleLabel } from "@/lib/bookings.shared";
import {
  PARTNER_APPLICATION_PHONE_HELPER_TEXT,
  validateIndonesianWhatsAppPhone,
} from "@/lib/partner-application-validation";

const BookingLocationMap = dynamic(
  () => import("@/components/landingpage/bookingform/BookingLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
        <div className="border-b border-black/8 bg-white px-5 py-4 text-black md:px-6">
          <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
            Titik Lokasi
          </p>
          <h3 className="mt-2 text-[20px] leading-tight text-black md:text-[24px]">
            Memuat peta lokasi acara
          </h3>
        </div>
        <div className="flex h-[420px] items-center justify-center p-4 text-[15px] text-black/55">
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
  locationSearch: string;
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
  packageDuration: string;
  packageDurationMinutes: number;
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

type ValidateWhatsAppResponse = {
  valid?: boolean;
  phone?: string;
  message?: string;
};

type LocationSearchResult = {
  placeId: string;
  displayName: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

type LocationSearchResponse = {
  results?: LocationSearchResult[];
  message?: string;
};

type ReverseLocationResponse = {
  location?: {
    displayName: string;
    primaryText: string;
    secondaryText: string;
    latitude: number;
    longitude: number;
  } | null;
  message?: string;
};

type PaymentStatusValue =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "partial_refunded"
  | "chargeback";

type PaymentReconcileResponse = {
  success?: boolean;
  pending?: boolean;
  message?: string;
  booking?: {
    id: number;
    status: string;
    lifecycleStatus: string;
    lifecycleStatusLabel: string;
  };
  payment?: {
    status: PaymentStatusValue | null;
    paidAt?: string | null;
  };
};

type PhoneValidationState = {
  status: "idle" | "checking" | "valid" | "invalid" | "error";
  message: string | null;
  normalizedPhone: string | null;
};

type ActiveCheckoutState = {
  orderId: string;
  token: string;
  bookingStatusLabel: string;
  paymentStatus: PaymentStatusValue | null;
};

type SuccessModalState = {
  orderId: string;
  bookingStatusLabel: string;
  paymentStatus: PaymentStatusValue | null;
};

type FormErrors = Partial<
  Record<
    | "name"
    | "phone"
    | "category"
    | "package"
    | "date"
    | "time"
    | "eventAddress"
    | "coordinates",
    string
  >
>;

type PaymentFeedback = {
  tone: "success" | "warning" | "error";
  message: string;
};

type CoordinateSource = "search" | "map" | "device" | "manual";

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  helperText?: string;
  error?: string | null;
  statusMessage?: string | null;
  statusTone?: "success" | "warning" | "error" | "neutral";
  disabled?: boolean;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  autoComplete?: string;
  step?: string;
  min?: string;
  max?: string;
};

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string | null;
  disabled?: boolean;
  minHeightClassName?: string;
};

type SelectFieldProps = {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  optionLabels?: Record<string, string>;
  helperText?: string;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

type SummaryRowProps = {
  label: string;
  value: string;
  emphasize?: boolean;
};

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

const IDLE_PHONE_VALIDATION_STATE: PhoneValidationState = {
  status: "idle",
  message: null,
  normalizedPhone: null,
};

const INITIAL_FORM_STATE: BookingFormState = {
  name: "",
  phone: "",
  category: "",
  package: "",
  date: "",
  time: "",
  locationSearch: "",
  eventAddress: "",
  eventLatitude: "",
  eventLongitude: "",
  note: "",
};

const BOOKING_HISTORY_HREF = "/bookinghistory";
const HOME_HREF = "/";
const DEFAULT_BOOKING_STATUS_LABEL = getBookingLifecycleLabel("AwaitingPayment");
const LOGIN_DESCRIPTION =
  "Silakan login terlebih dahulu untuk melanjutkan booking. Setelah berhasil login, Anda akan kembali ke halaman ini tanpa perlu mengisi ulang dari awal.";

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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildBookingAddress(detailAddress: string, selectedLocationLabel: string | null) {
  const detail = detailAddress.trim();
  const location = selectedLocationLabel?.trim() || "";

  if (detail && location) {
    return `${detail} (${location})`;
  }

  return detail || location;
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

function getPhoneValidationTone(
  state: PhoneValidationState
): InputFieldProps["statusTone"] {
  if (state.status === "valid") {
    return "success";
  }

  if (state.status === "checking") {
    return "neutral";
  }

  if (state.status === "error") {
    return "warning";
  }

  if (state.status === "invalid") {
    return "error";
  }

  return undefined;
}

function getPaymentStatusLabel(status: PaymentStatusValue | null) {
  const labels: Record<PaymentStatusValue, string> = {
    created: "Belum Dibayar",
    pending: "Menunggu Pembayaran",
    paid: "Sudah Dibayar",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan",
    refunded: "Refund Selesai",
    partial_refunded: "Refund Sebagian",
    chargeback: "Sengketa Pembayaran",
  };

  return status ? labels[status] : "Belum Dibayar";
}

function getStatusPillClassName(tone: "success" | "warning" | "error" | "neutral") {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "warning") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-black/10 bg-black/[0.03] text-black/70";
}

export default function BookingForm({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [form, setForm] = useState<BookingFormState>(INITIAL_FORM_STATE);
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
  const [paymentFeedback, setPaymentFeedback] = useState<PaymentFeedback | null>(
    null
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<LocationSearchResult[]>([]);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string | null>(
    null
  );
  const [reverseLocationLoading, setReverseLocationLoading] = useState(false);
  const [reverseLocationMessage, setReverseLocationMessage] = useState<
    string | null
  >(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!isAuthenticated);
  const [phoneValidation, setPhoneValidation] = useState<PhoneValidationState>(
    IDLE_PHONE_VALIDATION_STATE
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [activeCheckout, setActiveCheckout] = useState<ActiveCheckoutState | null>(
    null
  );
  const [snapLoading, setSnapLoading] = useState(false);
  const [paymentVerificationLoading, setPaymentVerificationLoading] =
    useState(false);
  const [successModalState, setSuccessModalState] =
    useState<SuccessModalState | null>(null);
  const hasEditedNameRef = useRef(false);
  const coordinateSourceRef = useRef<CoordinateSource | null>(null);
  const addressSearchRequestIdRef = useRef(0);
  const addressSearchAbortRef = useRef<AbortController | null>(null);

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
  const checkoutLocked = Boolean(activeCheckout) && !successModalState;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      addressSearchAbortRef.current?.abort();
    };
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
        // Biarkan form manual jika request user gagal.
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
      setError(
        "Tidak ada fotografer yang dipilih. Silakan kembali ke halaman fotografer."
      );
      return;
    }

    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/packages/${photographerIdParam}`, {
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as
          | {
              message?: string;
              partner?: PartnerSummary | null;
              categories?: PartnerCategory[];
              packages?: PartnerPackage[];
            }
          | null;

        if (!response.ok) {
          throw new Error(data?.message || `API error: ${response.status}`);
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
      } catch (fetchError) {
        console.error("BOOKING PACKAGES ERROR:", fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Gagal memuat data paket."
        );
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
      } catch (fetchError) {
        if (!ignore) {
          setUnavailableTimes([]);
          setTimeSlotSummaries([]);
          setAvailabilityError(
            fetchError instanceof Error
              ? fetchError.message
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

        return [time, `${currentSlot.rangeLabel} - ${getTimeSlotLabel(currentSlot)}`];
      })
    ) as Record<string, string>;
  }, [slotSummaryMap, timeSlotSummaries]);

  const selectedTimeSlot = useMemo(
    () => slotSummaryMap[form.time] ?? null,
    [form.time, slotSummaryMap]
  );

  const resolvedBookingAddress = useMemo(() => {
    return buildBookingAddress(form.eventAddress, selectedLocationLabel);
  }, [form.eventAddress, selectedLocationLabel]);

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

    if (!resolvedBookingAddress || !form.eventLatitude || !form.eventLongitude) {
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
            eventAddress: resolvedBookingAddress,
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
      } catch (fetchError) {
        if (!ignore) {
          setQuote(null);
          setQuoteError(
            fetchError instanceof Error
              ? fetchError.message
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
    form.eventLatitude,
    form.eventLongitude,
    isAuthenticated,
    mounted,
    photographerIdParam,
    resolvedBookingAddress,
    selectedCategory,
    selectedPackage,
  ]);

  useEffect(() => {
    if (!mounted || checkoutLocked) {
      return;
    }

    const latitude = parseCoordinateInput(form.eventLatitude, -90, 90);
    const longitude = parseCoordinateInput(form.eventLongitude, -180, 180);
    const source = coordinateSourceRef.current;

    if (latitude === null || longitude === null) {
      setReverseLocationLoading(false);

      if (!form.eventLatitude && !form.eventLongitude) {
        setSelectedLocationLabel(null);
        setReverseLocationMessage(null);
      }

      return;
    }

    if (!source || source === "search" || source === "manual") {
      return;
    }

    coordinateSourceRef.current = null;
    setReverseLocationLoading(true);
    setReverseLocationMessage(null);
    setSelectedLocationLabel(null);

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/locations/reverse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude,
            longitude,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | ReverseLocationResponse
          | null;

        if (ignore) {
          return;
        }

        if (!response.ok || !data?.location?.displayName) {
          setSelectedLocationLabel(null);
          setReverseLocationMessage(
            data?.message ||
              "Titik lokasi sudah dipilih, tetapi nama lokasinya belum dapat dimuat saat ini."
          );
          return;
        }

        setSelectedLocationLabel(data.location.displayName);
        setReverseLocationMessage(null);
      } catch (reverseError) {
        if (!ignore) {
          setSelectedLocationLabel(null);
          setReverseLocationMessage(
            reverseError instanceof Error
              ? reverseError.message
              : "Titik lokasi sudah dipilih, tetapi nama lokasinya belum dapat dimuat saat ini."
          );
        }
      } finally {
        if (!ignore) {
          setReverseLocationLoading(false);
        }
      }
    }, 650);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    checkoutLocked,
    form.eventLatitude,
    form.eventLongitude,
    mounted,
  ]);

  const summaryBookingStatusLabel = successModalState?.bookingStatusLabel
    ? successModalState.bookingStatusLabel
    : activeCheckout?.bookingStatusLabel || DEFAULT_BOOKING_STATUS_LABEL;
  const summaryPaymentStatusLabel = getPaymentStatusLabel(
    successModalState?.paymentStatus ?? activeCheckout?.paymentStatus ?? null
  );

  function clearFieldError(key: keyof FormErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateForm<K extends keyof BookingFormState>(
    key: K,
    value: BookingFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(value: string) {
    hasEditedNameRef.current = true;
    updateForm("name", value);
    clearFieldError("name");
  }

  function handlePhoneChange(value: string) {
    updateForm("phone", value);
    setPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
    clearFieldError("phone");
  }

  function handleCategoryChange(value: number) {
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
    clearFieldError("category");
    clearFieldError("package");
    clearFieldError("time");
  }

  function handlePackageChange(value: number) {
    setForm((prev) => ({
      ...prev,
      package: value,
      time: "",
    }));
    setTimeError(null);
    setQuote(null);
    setQuoteError(null);
    setPaymentFeedback(null);
    clearFieldError("package");
    clearFieldError("time");
  }

  function handleDateChange(value: string) {
    updateForm("date", value);
    clearFieldError("date");
  }

  function handleTimeChange(value: string) {
    updateForm("time", value);
    const slot = slotSummaryMap[value];
    setTimeError(
      slot && slot.status !== "available"
        ? getTimeSlotErrorMessage(slot) || "Jadwal tidak tersedia."
        : null
    );
    clearFieldError("time");
  }

  function handleLocationSearchChange(value: string) {
    updateForm("locationSearch", value);
    setAddressSearchError(null);
    setAddressResults([]);

    if (!value.trim()) {
      addressSearchAbortRef.current?.abort();
      setAddressSearchLoading(false);
    }
  }

  function handleLocationSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void handleLocationSearchSubmit();
  }

  function handleDetailAddressChange(value: string) {
    updateForm("eventAddress", value);
    clearFieldError("eventAddress");
  }

  function handleCoordinateChange(
    latitude: string,
    longitude: string,
    source: CoordinateSource
  ) {
    coordinateSourceRef.current = source;
    setForm((prev) => ({
      ...prev,
      eventLatitude: latitude,
      eventLongitude: longitude,
    }));
    setQuoteError(null);
    clearFieldError("coordinates");
  }

  function handleMapCoordinateChange(latitude: string, longitude: string) {
    handleCoordinateChange(latitude, longitude, "map");
  }

  async function handleLocationSearchSubmit(queryOverride?: string) {
    if (!mounted || checkoutLocked) {
      return;
    }

    const query = (queryOverride ?? form.locationSearch).trim();

    if (query.length < 3) {
      setAddressResults([]);
      setAddressSearchError("Masukkan minimal 3 karakter untuk mencari lokasi.");
      return;
    }

    addressSearchAbortRef.current?.abort();
    const nextRequestId = addressSearchRequestIdRef.current + 1;
    addressSearchRequestIdRef.current = nextRequestId;
    const controller = new AbortController();
    addressSearchAbortRef.current = controller;

    setAddressSearchLoading(true);
    setAddressSearchError(null);

    try {
      const response = await fetch("/api/locations/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 6,
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as
        | LocationSearchResponse
        | null;

      if (addressSearchRequestIdRef.current !== nextRequestId) {
        return;
      }

      if (!response.ok) {
        setAddressResults([]);
        setAddressSearchError(
          data?.message ||
            "Tidak dapat mencari lokasi saat ini. Silakan coba kembali atau tentukan titik melalui peta."
        );
        return;
      }

      setAddressResults(Array.isArray(data?.results) ? data.results : []);
      setAddressSearchError(null);
    } catch (searchError) {
      if (
        controller.signal.aborted ||
        addressSearchRequestIdRef.current !== nextRequestId
      ) {
        return;
      }

      setAddressResults([]);
      setAddressSearchError(
        searchError instanceof Error
          ? searchError.message
          : "Tidak dapat mencari lokasi saat ini. Silakan coba kembali atau tentukan titik melalui peta."
      );
    } finally {
      if (addressSearchRequestIdRef.current === nextRequestId) {
        setAddressSearchLoading(false);
        addressSearchAbortRef.current = null;
      }
    }
  }

  async function validatePhoneValue(phoneValue = form.phone) {
    const trimmedPhone = phoneValue.trim();

    if (!trimmedPhone) {
      setPhoneValidation(IDLE_PHONE_VALIDATION_STATE);
      return {
        valid: false,
        message: "Nomor WhatsApp wajib diisi.",
      };
    }

    const phoneFormatError = validateIndonesianWhatsAppPhone(trimmedPhone);

    if (phoneFormatError) {
      setPhoneValidation({
        status: "invalid",
        message: phoneFormatError,
        normalizedPhone: null,
      });
      return {
        valid: false,
        message: phoneFormatError,
      };
    }

    setPhoneValidation({
      status: "checking",
      message: "Memeriksa nomor WhatsApp...",
      normalizedPhone: null,
    });

    try {
      const response = await fetch("/api/whatsapp/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: trimmedPhone,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ValidateWhatsAppResponse
        | null;

      if (response.ok && data?.valid && data.phone) {
        setPhoneValidation({
          status: "valid",
          message: "Nomor terdaftar di WhatsApp.",
          normalizedPhone: data.phone,
        });
        return {
          valid: true,
          message: null,
        };
      }

      if (response.status === 400) {
        const invalidMessage = data?.message || "Nomor WhatsApp tidak valid.";
        setPhoneValidation({
          status: "invalid",
          message: invalidMessage,
          normalizedPhone: data?.phone ?? null,
        });
        return {
          valid: false,
          message: invalidMessage,
        };
      }

      if (response.status === 503 || response.status === 429) {
        const serviceMessage =
          data?.message ||
          "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.";
        setPhoneValidation({
          status: "error",
          message: serviceMessage,
          normalizedPhone: data?.phone ?? null,
        });
        return {
          valid: false,
          message: serviceMessage,
        };
      }

      const notRegisteredMessage =
        data?.message || "Nomor tidak terdaftar di WhatsApp.";
      setPhoneValidation({
        status: "invalid",
        message: notRegisteredMessage,
        normalizedPhone: data?.phone ?? null,
      });
      return {
        valid: false,
        message: notRegisteredMessage,
      };
    } catch (validationError) {
      console.error("BOOKING WHATSAPP VALIDATION ERROR:", validationError);
      const fallbackMessage =
        "Tidak dapat memverifikasi nomor WhatsApp saat ini. Silakan coba kembali.";
      setPhoneValidation({
        status: "error",
        message: fallbackMessage,
        normalizedPhone: null,
      });
      return {
        valid: false,
        message: fallbackMessage,
      };
    }
  }

  async function ensurePhoneValidated() {
    if (phoneValidation.status === "valid") {
      return {
        valid: true,
        message: null,
      };
    }

    return validatePhoneValue(form.phone);
  }

  async function verifySuccessfulPayment(orderId: string) {
    setPaymentVerificationLoading(true);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetch("/api/payment/reconcile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | PaymentReconcileResponse
          | null;

        const nextBookingStatusLabel =
          data?.booking?.lifecycleStatusLabel || DEFAULT_BOOKING_STATUS_LABEL;
        const nextPaymentStatus = data?.payment?.status ?? "pending";

        setActiveCheckout((prev) =>
          prev && prev.orderId === orderId
            ? {
                ...prev,
                bookingStatusLabel: nextBookingStatusLabel,
                paymentStatus: nextPaymentStatus,
              }
            : prev
        );

        if (response.ok && data?.success) {
          setPaymentFeedback({
            tone: "success",
            message:
              "Pembayaran berhasil diterima dan booking sedang diproses.",
          });
          setSuccessModalState({
            orderId,
            bookingStatusLabel: nextBookingStatusLabel,
            paymentStatus: data.payment?.status ?? "paid",
          });
          setPaymentVerificationLoading(false);
          return;
        }

        const shouldRetry =
          response.status === 202 ||
          response.status === 503 ||
          data?.pending === true;

        if (!shouldRetry) {
          setPaymentFeedback({
            tone: "warning",
            message:
              data?.message ||
              "Status pembayaran belum berhasil dikonfirmasi. Silakan cek Riwayat Booking beberapa saat lagi.",
          });
          setPaymentVerificationLoading(false);
          return;
        }
      } catch (reconcileError) {
        if (attempt === 5) {
          console.error("BOOKING PAYMENT RECONCILE ERROR:", reconcileError);
          setPaymentFeedback({
            tone: "warning",
            message:
              "Pembayaran sedang disinkronkan. Silakan cek Riwayat Booking beberapa saat lagi.",
          });
          setPaymentVerificationLoading(false);
          return;
        }
      }

      await sleep(1500);
    }

    setPaymentFeedback({
      tone: "warning",
      message:
        "Pembayaran sedang disinkronkan. Silakan cek Riwayat Booking beberapa saat lagi.",
    });
    setPaymentVerificationLoading(false);
  }

  function openSnapCheckout(checkout: ActiveCheckoutState) {
    if (typeof window.snap?.pay !== "function") {
      setPaymentFeedback({
        tone: "error",
        message: "Popup pembayaran belum siap. Coba beberapa saat lagi.",
      });
      return;
    }

    setSnapLoading(true);

    window.snap.pay(checkout.token, {
      onSuccess: function () {
        setSnapLoading(false);
        setPaymentFeedback({
          tone: "warning",
          message:
            "Pembayaran diterima. Sistem sedang memverifikasi status booking Anda.",
        });
        void verifySuccessfulPayment(checkout.orderId);
      },
      onPending: function () {
        setSnapLoading(false);
        setActiveCheckout((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: "pending",
              }
            : prev
        );
        setPaymentFeedback({
          tone: "warning",
          message:
            "Booking sudah dibuat dan pembayaran masih menunggu penyelesaian dari Anda.",
        });
      },
      onError: function () {
        setSnapLoading(false);
        setPaymentFeedback({
          tone: "error",
          message:
            "Pembayaran belum berhasil. Booking tetap tersimpan dan Anda bisa melanjutkan checkout yang sama.",
        });
      },
      onClose: function () {
        setSnapLoading(false);
        setPaymentFeedback({
          tone: "warning",
          message:
            "Popup pembayaran ditutup. Booking tetap tersimpan. Gunakan tombol Lanjutkan Pembayaran untuk meneruskan checkout yang sama.",
        });
      },
    });
  }

  function validateBookingForm() {
    const nextErrors: FormErrors = {};
    const latitude = parseCoordinateInput(form.eventLatitude, -90, 90);
    const longitude = parseCoordinateInput(form.eventLongitude, -180, 180);

    if (!form.name.trim()) {
      nextErrors.name = "Nama lengkap wajib diisi.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Nomor WhatsApp wajib diisi.";
    } else {
      const phoneFormatError = validateIndonesianWhatsAppPhone(form.phone.trim());

      if (phoneFormatError) {
        nextErrors.phone = phoneFormatError;
      }
    }

    if (!selectedCategory) {
      nextErrors.category = "Pilih kategori layanan terlebih dahulu.";
    }

    if (!selectedPackage) {
      nextErrors.package = "Pilih paket terlebih dahulu.";
    }

    if (!form.date) {
      nextErrors.date = "Tanggal booking wajib dipilih.";
    }

    if (!form.time) {
      nextErrors.time = "Jam mulai booking wajib dipilih.";
    }

    if (!form.eventAddress.trim()) {
      nextErrors.eventAddress =
        "Detail alamat atau patokan wajib diisi agar fotografer mudah menemukan lokasi.";
    }

    if (latitude === null || longitude === null) {
      nextErrors.coordinates =
        "Tentukan titik lokasi melalui pencarian, peta, atau lokasi perangkat.";
    }

    if (form.time && unavailableTimes.includes(form.time)) {
      nextErrors.time =
        getTimeSlotErrorMessage(slotSummaryMap[form.time]) ||
        "Jam mulai yang dipilih sudah tidak tersedia.";
    }

    setFieldErrors(nextErrors);
    return nextErrors;
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setQuoteError("Browser ini tidak mendukung geolocation.");
      return;
    }

    setGeoLoading(true);
    setQuoteError(null);
    setReverseLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleCoordinateChange(
          position.coords.latitude.toFixed(8),
          position.coords.longitude.toFixed(8),
          "device"
        );
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
  }

  function handleSelectAddressResult(result: LocationSearchResult) {
    coordinateSourceRef.current = "search";
    setSelectedLocationLabel(result.displayName);
    setReverseLocationMessage(null);
    setForm((prev) => ({
      ...prev,
      locationSearch: result.displayName,
      eventLatitude: result.latitude.toFixed(8),
      eventLongitude: result.longitude.toFixed(8),
    }));
    setAddressResults([]);
    setAddressSearchError(null);
    setQuoteError(null);
    clearFieldError("coordinates");
  }

  async function handlePayment() {
    setPaymentFeedback(null);

    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    if (activeCheckout) {
      openSnapCheckout(activeCheckout);
      return;
    }

    const nextErrors = validateBookingForm();

    if (Object.keys(nextErrors).length > 0) {
      setPaymentFeedback({
        tone: "error",
        message: "Lengkapi data booking terlebih dahulu.",
      });
      return;
    }

    const phoneResult = await ensurePhoneValidated();

    if (!phoneResult.valid) {
      const isServiceValidationIssue = Boolean(
        phoneResult.message?.includes("Tidak dapat memverifikasi nomor WhatsApp")
      );
      setPaymentFeedback({
        tone: isServiceValidationIssue ? "warning" : "error",
        message:
          phoneResult.message ||
          "Nomor WhatsApp belum dapat diverifikasi. Periksa kembali nomor Anda.",
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

    setSubmitLoading(true);

    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: phoneValidation.normalizedPhone || form.phone.trim(),
          amount: quote.totalPrice,
          categoryId: selectedCategory?.id,
          packageId: selectedPackage?.id,
          photographerId: Number(photographerIdParam),
          date: form.date,
          time: form.time,
          eventAddress: resolvedBookingAddress,
          eventLatitude: Number(form.eventLatitude),
          eventLongitude: Number(form.eventLongitude),
          note: form.note.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            token?: string;
            orderId?: string;
          }
        | null;

      if (!response.ok) {
        if (response.status === 401) {
          setIsLoginModalOpen(true);
        }

        if (response.status === 409) {
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

      if (!data?.token || !data.orderId) {
        setPaymentFeedback({
          tone: "error",
          message: "Token pembayaran tidak tersedia.",
        });
        return;
      }

      const checkout = {
        orderId: data.orderId,
        token: data.token,
        bookingStatusLabel: DEFAULT_BOOKING_STATUS_LABEL,
        paymentStatus: "pending" as PaymentStatusValue,
      } satisfies ActiveCheckoutState;

      setActiveCheckout(checkout);
      setPaymentFeedback({
        tone: "warning",
        message:
          "Booking sudah dibuat. Selesaikan pembayaran untuk mengonfirmasi jadwal Anda.",
      });
      openSnapCheckout(checkout);
    } catch (submitError) {
      setPaymentFeedback({
        tone: "error",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Gagal memulai proses pembayaran.",
      });
    } finally {
      setSubmitLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section
        data-navbar-tone="dark"
        className="min-h-screen bg-white px-6 py-10 font-[NeueHaas] text-black md:px-20"
      >
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="rounded-[32px] border border-black/10 bg-white/90 p-8 shadow-[0_28px_70px_rgba(17,17,17,0.08)] backdrop-blur md:p-10">
            <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
              Booking AirisLens
            </p>
            <h1 className="mt-4 text-[28px] font-normal leading-tight md:text-[40px]">
              Masuk ke akun Anda sebelum melanjutkan pemesanan.
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-8 text-black/70 md:text-[20px]">
              Data paket, pembayaran, dan riwayat booking hanya bisa diproses
              untuk pengguna yang sudah login agar seluruh pesanan tetap
              tersambung ke akun yang benar.
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
                className="inline-flex items-center rounded-full border border-black/15 bg-white px-6 py-3 text-[16px] text-black transition hover:bg-black hover:text-white"
              >
                Tampilkan pop up lagi
              </button>
            </div>
          </div>
        </div>

        <LoginRequiredModal
          open={isLoginModalOpen}
          loginHref={loginHref}
          description={LOGIN_DESCRIPTION}
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
      <div className="mx-auto mt-10 max-w-[1380px]">
        <div className="rounded-[34px] border border-black/10 bg-[radial-gradient(circle_at_88%_115%,rgba(176,0,0,0.96)_0%,rgba(117,0,0,0.82)_18%,rgba(53,0,0,0.46)_34%,rgba(5,0,0,0)_56%),linear-gradient(135deg,#050000_0%,#0a0000_54%,#150000_100%)] px-6 py-8 text-white shadow-[0_32px_90px_rgba(17,17,17,0.18)] md:px-10 md:py-10">
          <p className="text-[12px] uppercase tracking-[0.2em] text-white/65">
            Booking AirisLens
          </p>
          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-[28px] font-normal leading-[1.05] md:text-[40px]">
                Atur sesi fotografi Anda dengan alur booking yang lebih rapi,
                jelas, dan siap dibayar dalam satu langkah.
              </h1>
              <p className="mt-4 max-w-3xl text-[16px] leading-7 text-white/74 md:text-[19px]">
                Lengkapi data pemesan, pilih paket, tentukan titik lokasi di
                peta, lalu cek rincian biaya sebelum melanjutkan pembayaran.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/12 bg-black/22 p-5 backdrop-blur">
              <p className="text-[12px] uppercase tracking-[0.18em] text-white/60">
                Ringkasan cepat
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickStat
                  label="Status Booking"
                  value={summaryBookingStatusLabel}
                />
                <QuickStat
                  label="Status Pembayaran"
                  value={summaryPaymentStatusLabel}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            {activeCheckout ? (
              <div className="rounded-[28px] border border-black/10 bg-black/[0.03] px-5 py-4 text-[15px] leading-7 text-black/72 shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
                Booking sudah dibuat dengan status menunggu pembayaran. Untuk
                mencegah pesanan ganda, detail booking dikunci sementara sampai
                checkout ini selesai atau Anda melanjutkan pembayaran yang sama.
              </div>
            ) : null}

            <SectionCard
              eyebrow="A. Informasi Pemesan"
              title="Data pemesan yang akan digunakan untuk booking"
              description="Nomor WhatsApp akan diverifikasi menggunakan layanan yang sama dengan proses pengajuan mitra."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <InputField
                  label="Nama Pemesan"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Masukkan nama lengkap"
                  autoComplete="name"
                  error={fieldErrors.name || null}
                  disabled={checkoutLocked}
                />
                <InputField
                  label="Nomor WhatsApp"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  onBlur={() => void validatePhoneValue()}
                  placeholder="08xxxxxxxxxx"
                  autoComplete="tel"
                  type="tel"
                  inputMode="numeric"
                  helperText={PARTNER_APPLICATION_PHONE_HELPER_TEXT}
                  error={fieldErrors.phone || null}
                  statusMessage={phoneValidation.message}
                  statusTone={getPhoneValidationTone(phoneValidation)}
                  disabled={checkoutLocked}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="B. Detail Pemotretan"
              title="Pilih layanan, paket, dan jadwal yang tersedia"
              description="Ketersediaan jam akan mengikuti durasi paket dan jadwal partner secara real-time."
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] leading-tight md:text-[24px]">
                      Kategori layanan
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-black/58">
                      Pilih kategori untuk menampilkan paket yang relevan.
                    </p>
                  </div>
                  {fieldErrors.category ? (
                    <p className="text-[14px] text-rose-600">
                      {fieldErrors.category}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
                    {error}
                  </div>
                ) : null}

                {loading ? (
                  <p className="mt-4 text-[15px] text-black/55">
                    Memuat kategori dan paket...
                  </p>
                ) : null}

                {!loading && categories.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {categories.map((item) => {
                      const active = Number(form.category) === Number(item.id);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleCategoryChange(Number(item.id))}
                          disabled={checkoutLocked}
                          className={`rounded-full border px-5 py-3 text-[15px] transition ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-black/10 bg-white text-black hover:border-black/30 hover:bg-black/[0.03]"
                          } ${
                            checkoutLocked
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {!loading && categories.length === 0 && !error ? (
                  <p className="mt-4 text-[15px] text-black/55">
                    Fotografer ini belum memiliki kategori layanan aktif.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoTile
                  label="Kategori aktif"
                  value={selectedCategory?.name || "-"}
                />
                <InfoTile
                  label="Paket terpilih"
                  value={selectedPackage?.name || "Belum dipilih"}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] leading-tight md:text-[24px]">
                      Paket layanan
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-black/58">
                      Pilih paket yang paling sesuai dengan kebutuhan sesi Anda.
                    </p>
                  </div>
                  {fieldErrors.package ? (
                    <p className="text-[14px] text-rose-600">
                      {fieldErrors.package}
                    </p>
                  ) : null}
                </div>

                {!loading && selectedCategory && visiblePackages.length > 0 ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visiblePackages.map((item) => {
                      const active = Number(form.package) === Number(item.id);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handlePackageChange(Number(item.id))}
                          disabled={checkoutLocked}
                          className={`rounded-[26px] border px-5 py-5 text-left transition ${
                            active
                              ? "border-black bg-black text-white shadow-[0_18px_45px_rgba(17,17,17,0.14)]"
                              : "border-black/10 bg-white hover:border-black/20 hover:bg-black/[0.02]"
                          } ${
                            checkoutLocked
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        >
                          <p className="text-[18px] leading-tight">{item.name}</p>
                          <p
                            className={`mt-2 text-[14px] leading-6 ${
                              active ? "text-white/74" : "text-black/58"
                            }`}
                          >
                            {item.duration}
                          </p>
                          <p className="mt-4 text-[20px]">
                            {formatCurrency(Number(item.price))}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {!loading && selectedCategory && visiblePackages.length === 0 && !error ? (
                  <p className="mt-4 text-[15px] text-black/55">
                    Belum ada paket pada kategori {selectedCategory.name}.
                  </p>
                ) : null}

                {!loading && !selectedCategory && categories.length > 0 ? (
                  <p className="mt-4 text-[15px] text-black/55">
                    Pilih kategori terlebih dahulu untuk melihat paket yang
                    tersedia.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <InputField
                  label="Tanggal Pemotretan"
                  type="date"
                  value={form.date}
                  onChange={handleDateChange}
                  error={fieldErrors.date || null}
                  disabled={checkoutLocked}
                />
                <SelectField
                  label="Jam Mulai"
                  options={timeSlotOptions}
                  value={form.time}
                  onChange={handleTimeChange}
                  disabledOptions={unavailableTimes}
                  optionLabels={slotOptionLabels}
                  error={fieldErrors.time || timeError}
                  helperText={
                    selectedPackage
                      ? "Jam yang tampil sudah disesuaikan dengan durasi paket."
                      : "Pilih paket terlebih dahulu untuk melihat slot waktu."
                  }
                  disabled={checkoutLocked || !selectedPackage || !form.date}
                  placeholder="Pilih jam mulai"
                />
              </div>

              {!selectedPackage && form.date ? (
                <p className="text-[14px] leading-6 text-black/55">
                  Pilih paket terlebih dahulu agar sistem menampilkan slot jam
                  mulai sesuai durasi paket.
                </p>
              ) : null}

              {selectedPackage && form.date ? (
                <div className="space-y-4">
                  {availabilityLoading ? (
                    <p className="text-[15px] text-black/55">
                      Memeriksa ketersediaan jadwal...
                    </p>
                  ) : null}

                  {!availabilityLoading && availabilityError ? (
                    <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
                      {availabilityError}
                    </div>
                  ) : null}

                  {!availabilityLoading &&
                  !availabilityError &&
                  timeSlotSummaries.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-3 text-[13px]">
                        <Badge tone="success" text="Tersedia" />
                        <Badge tone="error" text="Penuh" />
                        <Badge tone="neutral" text="Ditutup partner" />
                        <Badge tone="warning" text="Di luar jam kerja" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {timeSlotSummaries.map((slot) => {
                          const isSelected = form.time === slot.time;
                          const isDisabled = slot.status !== "available";

                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={checkoutLocked || isDisabled}
                              onClick={() => handleTimeChange(slot.time)}
                              className={`rounded-[22px] border px-4 py-4 text-left transition ${
                                isSelected
                                  ? "border-black bg-black text-white shadow-[0_18px_45px_rgba(17,17,17,0.14)]"
                                  : slot.status === "available"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
                                  : slot.status === "closed"
                                      ? "border-slate-200 bg-slate-100 text-slate-500"
                                      : slot.status === "outside_working_hours"
                                        ? "border-slate-200 bg-slate-50 text-slate-700"
                                        : "border-rose-200 bg-rose-50 text-rose-700"
                              } ${
                                checkoutLocked || isDisabled
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-[16px] font-medium">
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
                              <p className="mt-3 text-[14px]">
                                {getTimeSlotLabel(slot)}
                              </p>
                              <p className="mt-2 text-[12px] opacity-80">
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
                    </>
                  ) : null}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              eyebrow="C. Lokasi Pemotretan"
              title="Cari area acara, tentukan titik, lalu lengkapi alamat detail"
              description="Koordinat digunakan untuk menghitung jarak dan biaya transportasi. Alamat detail tetap bisa Anda tulis manual."
            >
              <div className="rounded-[28px] border border-black/10 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] leading-tight md:text-[24px]">
                      Cari lokasi atau nama tempat
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-black/58">
                      Ketik alamat secara fleksibel. Misalnya: Slawi Tegal, Debong
                      Tegal, atau Jl. Ahmad Yani Tegal.
                    </p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] text-black/65">
                    Gunakan Enter atau tombol cari
                  </span>
                </div>

                <div className="mt-5">
                  <label className="block">
                    <span className="mb-3 block text-[16px] leading-none text-black md:text-[17px]">
                      Cari Lokasi
                    </span>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={form.locationSearch}
                        onChange={(event) =>
                          handleLocationSearchChange(event.target.value)
                        }
                        onKeyDown={handleLocationSearchKeyDown}
                        placeholder="Contoh: Jl. Ahmad Yani, Tegal"
                        disabled={checkoutLocked}
                        className={`w-full rounded-[22px] border border-black/10 bg-white px-4 py-4 text-[16px] text-black outline-none transition focus:border-black md:text-[17px] ${
                          checkoutLocked
                            ? "cursor-not-allowed bg-black/[0.03] text-black/45"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleLocationSearchSubmit()}
                        disabled={
                          checkoutLocked ||
                          addressSearchLoading ||
                          form.locationSearch.trim().length < 3
                        }
                        className={`inline-flex min-w-[148px] items-center justify-center rounded-[22px] px-5 py-4 text-[15px] transition ${
                          checkoutLocked ||
                          addressSearchLoading ||
                          form.locationSearch.trim().length < 3
                            ? "cursor-not-allowed border border-black/10 bg-black/[0.05] text-black/45"
                            : "bg-black text-white hover:bg-black/86"
                        }`}
                      >
                        {addressSearchLoading ? "Mencari..." : "Cari Lokasi"}
                      </button>
                    </div>
                    <p className="mt-3 text-[14px] leading-6 text-black/58">
                      Pencarian dijalankan saat Anda menekan Enter atau tombol
                      cari, lalu pilih salah satu hasil agar peta berpindah ke
                      lokasi yang sesuai.
                    </p>
                  </label>
                </div>

                {addressSearchError ? (
                  <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] leading-6 text-rose-700">
                    {addressSearchError}
                  </div>
                ) : null}

                {addressResults.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {addressResults.map((result) => (
                      <button
                        key={result.placeId}
                        type="button"
                        onClick={() => handleSelectAddressResult(result)}
                        disabled={checkoutLocked}
                        className={`block w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-left transition hover:border-black/20 hover:bg-black/[0.02] ${
                          checkoutLocked ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[16px] text-black">
                              {result.primaryText}
                            </p>
                            <p className="mt-2 text-[14px] leading-6 text-black/62">
                              {result.secondaryText || result.displayName}
                            </p>
                          </div>
                          <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-black/55">
                            Pilih
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-black/45">
                    Lokasi titik terpilih
                  </p>
                  <p className="mt-3 text-[17px] leading-7 text-black md:text-[18px]">
                    {selectedLocationLabel || "Belum ada titik lokasi yang dipilih."}
                  </p>
                  {reverseLocationLoading ? (
                    <p className="mt-3 text-[14px] text-black/55">
                      Memuat nama lokasi dari titik peta...
                    </p>
                  ) : null}
                  {!reverseLocationLoading && reverseLocationMessage ? (
                    <p className="mt-3 text-[14px] leading-6 text-black/58">
                      {reverseLocationMessage}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-black/45">
                    Jarak saat ini
                  </p>
                  <p className="mt-3 text-[24px] leading-none text-black">
                    {quote ? `${formatDistanceKm(quote.distanceKm)} km` : "-"}
                  </p>
                  <p className="mt-3 text-[14px] leading-6 text-black/58">
                    {quote
                      ? "Jarak dihitung dari lokasi partner ke titik acara."
                      : "Jarak akan muncul setelah titik lokasi dan paket terpilih."}
                  </p>
                </div>
              </div>

              <TextareaField
                label="Detail Alamat / Patokan"
                value={form.eventAddress}
                onChange={handleDetailAddressChange}
                placeholder="Contoh: Jl. Mawar No. 12 RT 03/RW 04, dekat Masjid Al-Ikhlas"
                helperText="Alamat ini boleh ditulis manual dan tidak harus sama persis dengan hasil pencarian peta."
                error={fieldErrors.eventAddress || null}
                disabled={checkoutLocked}
                minHeightClassName="min-h-[140px]"
              />

              <BookingLocationMap
                latitude={form.eventLatitude}
                longitude={form.eventLongitude}
                disabled={checkoutLocked}
                onChange={handleMapCoordinateChange}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <InputField
                  label="Latitude Acara"
                  value={form.eventLatitude}
                  onChange={(value) =>
                    handleCoordinateChange(value, form.eventLongitude, "manual")
                  }
                  placeholder="-6.86940000"
                  type="number"
                  step="0.00000001"
                  min="-90"
                  max="90"
                  error={fieldErrors.coordinates || null}
                  helperText="Boleh diisi manual jika Anda sudah mengetahui titik koordinat."
                  disabled={checkoutLocked}
                />
                <InputField
                  label="Longitude Acara"
                  value={form.eventLongitude}
                  onChange={(value) =>
                    handleCoordinateChange(form.eventLatitude, value, "manual")
                  }
                  placeholder="109.14020000"
                  type="number"
                  step="0.00000001"
                  min="-180"
                  max="180"
                  error={fieldErrors.coordinates || null}
                  helperText="Koordinat ini akan digunakan untuk menghitung jarak dan biaya transportasi."
                  disabled={checkoutLocked}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleUseCurrentLocation()}
                  disabled={geoLoading || checkoutLocked}
                  className={`rounded-full border border-black/15 px-5 py-3 text-[15px] transition ${
                    geoLoading || checkoutLocked
                      ? "cursor-not-allowed bg-white text-black/45"
                      : "bg-white text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {geoLoading ? "Mengambil lokasi..." : "Gunakan lokasi saya"}
                </button>
                <p className="text-[14px] leading-6 text-black/58">
                  Anda juga dapat menentukan titik lokasi langsung melalui peta.
                </p>
              </div>

              {(quoteLoading || quoteError) ? (
                <div
                  className={`rounded-[22px] border px-4 py-3 text-[14px] leading-6 ${
                    quoteError
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-black/10 bg-black/[0.03] text-black/70"
                  }`}
                >
                  {quoteError || "Menghitung rincian pembayaran..."}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              eyebrow="D. Catatan"
              title="Tambahkan kebutuhan khusus bila diperlukan"
              description="Catatan bersifat opsional, misalnya dress code, titik kumpul, atau kebutuhan rundown singkat."
            >
              <TextareaField
                label="Catatan Tambahan"
                value={form.note}
                onChange={(value) => updateForm("note", value)}
                placeholder="Tulis catatan tambahan untuk fotografer..."
                helperText="Contoh: akses parkir, titik kumpul, atau agenda singkat sesi."
                disabled={checkoutLocked}
              />
            </SectionCard>

            {paymentFeedback ? (
              <div
                className={`rounded-[26px] border px-5 py-4 text-[15px] leading-7 shadow-[0_20px_50px_rgba(17,17,17,0.05)] ${
                  paymentFeedback.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : paymentFeedback.tone === "warning"
                      ? "border-slate-200 bg-slate-50 text-slate-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {paymentFeedback.message}
              </div>
            ) : null}

            <div className="rounded-[30px] border border-black/10 bg-white p-5 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
                    Langkah akhir
                  </p>
                  <h2 className="mt-2 text-[20px] leading-tight md:text-[24px]">
                    Lanjutkan ke pembayaran Midtrans
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-black/58">
                    Booking hanya akan dibuat satu kali. Jika popup tertutup,
                    Anda bisa melanjutkan checkout yang sama tanpa membuat order
                    baru.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePayment()}
                  disabled={
                    loading ||
                    submitLoading ||
                    quoteLoading ||
                    snapLoading ||
                    paymentVerificationLoading ||
                    phoneValidation.status === "checking" ||
                    !selectedCategory ||
                    !selectedPackage ||
                    !photographerIdParam ||
                    !mounted ||
                    (!quote && !activeCheckout)
                  }
                  className={`inline-flex min-w-[240px] items-center justify-center rounded-full px-6 py-4 text-[16px] text-white transition ${
                    loading ||
                    submitLoading ||
                    quoteLoading ||
                    snapLoading ||
                    paymentVerificationLoading ||
                    phoneValidation.status === "checking" ||
                    !selectedCategory ||
                    !selectedPackage ||
                    !photographerIdParam ||
                    !mounted ||
                    (!quote && !activeCheckout)
                      ? "cursor-not-allowed bg-black/35"
                      : "bg-black hover:bg-black/86"
                  }`}
                >
                  {submitLoading
                    ? "Menyiapkan Pembayaran..."
                    : paymentVerificationLoading
                      ? "Memverifikasi Pembayaran..."
                      : snapLoading
                        ? "Membuka Popup Pembayaran..."
                        : activeCheckout
                          ? "Lanjutkan Pembayaran"
                          : quoteLoading
                            ? "Menghitung Total..."
                            : "Bayar & Booking"}
                </button>
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_28px_70px_rgba(17,17,17,0.08)]">
              <div className="border-b border-black/8 bg-white px-6 py-6">
                <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
                  E. Ringkasan Pembayaran
                </p>
                <h2 className="mt-3 text-[22px] leading-tight md:text-[28px]">
                  Rincian biaya booking Anda
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-black/58">
                  Kalkulasi tetap mengikuti pricing, jarak, dan biaya layanan yang
                  sudah digunakan sistem.
                </p>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className="grid gap-3">
                  <StatusSummaryCard
                    label="Status Booking"
                    value={summaryBookingStatusLabel}
                  />
                  <StatusSummaryCard
                    label="Status Pembayaran"
                    value={summaryPaymentStatusLabel}
                  />
                </div>

                <div className="space-y-3">
                  <SummaryRow
                    label="Fotografer"
                    value={quote?.brandName || partner?.brandName || "-"}
                  />
                  <SummaryRow
                    label="Alamat Fotografer"
                    value={quote?.photographerAddress || partner?.address || "-"}
                  />
                  <SummaryRow
                    label="Kategori Layanan"
                    value={selectedCategory?.name || quote?.categoryName || "-"}
                  />
                  <SummaryRow
                    label="Paket"
                    value={selectedPackage?.name || "-"}
                  />
                  <SummaryRow
                    label="Durasi"
                    value={selectedPackage?.duration || quote?.packageDuration || "-"}
                  />
                  <SummaryRow
                    label="Lokasi Titik"
                    value={selectedLocationLabel || "-"}
                  />
                  <SummaryRow
                    label="Detail Alamat"
                    value={form.eventAddress || "-"}
                  />
                  <SummaryRow
                    label="Titik Koordinat"
                    value={
                      form.eventLatitude && form.eventLongitude
                        ? `${form.eventLatitude}, ${form.eventLongitude}`
                        : "-"
                    }
                  />
                  <SummaryRow
                    label="Tanggal"
                    value={form.date || "-"}
                  />
                  <SummaryRow
                    label="Jam Mulai"
                    value={selectedTimeSlot?.rangeLabel || form.time || "-"}
                  />
                </div>

                <div className="rounded-[24px] border border-black/8 bg-black/[0.02] px-5 py-5">
                  <div className="space-y-3">
                    <SummaryRow
                      label="Harga Paket"
                      value={
                        quote
                          ? formatCurrency(quote.packagePrice)
                          : selectedPackage
                            ? formatCurrency(Number(selectedPackage.price))
                            : "-"
                      }
                    />
                    <SummaryRow
                      label="Jarak"
                      value={quote ? `${formatDistanceKm(quote.distanceKm)} km` : "-"}
                    />
                    <SummaryRow
                      label="Biaya Transportasi"
                      value={quote ? formatCurrency(quote.transportFee) : "-"}
                    />
                    <SummaryRow
                      label={
                        quote
                          ? `Biaya Layanan ${quote.serviceFeeRate}%`
                          : "Biaya Layanan"
                      }
                      value={quote ? formatCurrency(quote.serviceFee) : "-"}
                    />
                  </div>

                  <div className="mt-4 border-t border-black/8 pt-4">
                    <SummaryRow
                      label="Total Pembayaran"
                      value={quote ? formatCurrency(quote.totalPrice) : "-"}
                      emphasize
                    />
                  </div>
                </div>

                {quote ? (
                  <div className="rounded-[22px] border border-black/8 bg-white px-4 py-4 text-[13px] leading-6 text-black/68">
                    {quote.distanceKm <= quote.freeDistanceKm
                      ? `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini masih dalam batas gratis.`
                      : quote.flatTransportFee > 0
                        ? `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini melewati batas gratis sehingga dikenakan biaya transportasi tetap ${formatCurrency(quote.flatTransportFee)}.`
                        : `Gratis transport sampai ${formatDistanceKm(quote.freeDistanceKm)} km. Lokasi booking ini melewati batas gratis, tetapi partner tidak mengenakan biaya transportasi tambahan.`}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LoginRequiredModal
        open={isLoginModalOpen}
        loginHref={loginHref}
        description={LOGIN_DESCRIPTION}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {successModalState ? (
        <SuccessModal
          bookingHistoryHref={BOOKING_HISTORY_HREF}
          homeHref={HOME_HREF}
        />
      ) : null}
    </section>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-7">
      <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[24px] font-normal leading-tight md:text-[28px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-black/60">
          {description}
        </p>
      ) : null}
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  helperText,
  error = null,
  statusMessage = null,
  statusTone = "neutral",
  disabled = false,
  inputMode,
  autoComplete,
  step,
  min,
  max,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-3 block text-[16px] leading-none text-black md:text-[17px]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className={`w-full rounded-[22px] border bg-white px-4 py-4 text-[16px] outline-none transition md:text-[17px] ${
          error
            ? "border-rose-300 focus:border-rose-400"
            : "border-black/10 focus:border-black"
        } ${disabled ? "cursor-not-allowed bg-black/[0.03] text-black/45" : ""}`}
      />
      <FieldMeta
        helperText={helperText}
        error={error}
        statusMessage={statusMessage}
        statusTone={statusTone}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error = null,
  disabled = false,
  minHeightClassName = "min-h-[120px]",
}: TextareaFieldProps) {
  return (
    <label className="block">
      <span className="mb-3 block text-[16px] leading-none text-black md:text-[17px]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${minHeightClassName} w-full rounded-[24px] border bg-white px-4 py-4 text-[16px] outline-none transition md:text-[17px] ${
          error
            ? "border-rose-300 focus:border-rose-400"
            : "border-black/10 focus:border-black"
        } ${disabled ? "cursor-not-allowed bg-black/[0.03] text-black/45" : ""}`}
      />
      <FieldMeta helperText={helperText} error={error} />
    </label>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
  disabledOptions = [],
  optionLabels = {},
  helperText,
  error = null,
  disabled = false,
  placeholder = "Pilih opsi",
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-3 block text-[16px] leading-none text-black md:text-[17px]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`w-full rounded-[22px] border bg-white px-4 py-4 text-[16px] outline-none transition md:text-[17px] ${
          error
            ? "border-rose-300 focus:border-rose-400"
            : "border-black/10 focus:border-black"
        } ${disabled ? "cursor-not-allowed bg-black/[0.03] text-black/45" : ""}`}
      >
        <option value="">{placeholder}</option>
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
      <FieldMeta helperText={helperText} error={error} />
    </label>
  );
}

function FieldMeta({
  helperText,
  error,
  statusMessage,
  statusTone = "neutral",
}: {
  helperText?: string;
  error?: string | null;
  statusMessage?: string | null;
  statusTone?: "success" | "warning" | "error" | "neutral";
}) {
  const hasStatusMessage = Boolean(statusMessage && !error);

  return (
    <>
      {error ? (
        <p className="mt-3 text-[14px] leading-6 text-rose-600">{error}</p>
      ) : null}
      {!error && hasStatusMessage ? (
        <p
          className={`mt-3 text-[14px] leading-6 ${
            statusTone === "success"
              ? "text-emerald-700"
              : statusTone === "warning"
                ? "text-slate-700"
                : statusTone === "error"
                  ? "text-rose-600"
                  : "text-black/58"
          }`}
        >
          {statusMessage}
        </p>
      ) : null}
      {!error && !hasStatusMessage && helperText ? (
        <p className="mt-3 text-[14px] leading-6 text-black/58">{helperText}</p>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value, emphasize = false }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span
        className={`text-[14px] leading-6 ${
          emphasize ? "text-black" : "text-black/62"
        }`}
      >
        {label}
      </span>
      <span
        className={`max-w-[55%] text-right text-[14px] leading-6 ${
          emphasize ? "text-[18px] text-black" : "text-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  tone,
  text,
}: {
  tone: "success" | "warning" | "error" | "neutral";
  text: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[12px] ${getStatusPillClassName(
        tone
      )}`}
    >
      {text}
    </span>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5">
      <p className="text-[12px] uppercase tracking-[0.16em] text-black/45">
        {label}
      </p>
      <p className="mt-3 text-[18px] leading-7 text-black">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/12 bg-white/7 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
        {label}
      </p>
      <p className="mt-2 text-[16px] leading-6 text-white">{value}</p>
    </div>
  );
}

function StatusSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-black/45">
        {label}
      </p>
      <p className="mt-2 text-[16px] leading-6 text-black">{value}</p>
    </div>
  );
}

function SuccessModal({
  bookingHistoryHref,
  homeHref,
}: {
  bookingHistoryHref: string;
  homeHref: string;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-5 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white p-6 shadow-[0_32px_90px_rgba(17,17,17,0.22)] md:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[12px] uppercase tracking-[0.18em] text-black/45">
            Pembayaran Berhasil
          </p>
          <h2 className="mt-3 text-[28px] leading-tight text-black md:text-[32px]">
            Pesanan Anda Sudah Kami Terima!
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-black/65">
            Terima kasih telah melakukan pemesanan melalui AirisLens. Pembayaran
            Anda telah berhasil diterima dan pesanan sedang diproses. Anda dapat
            memantau perkembangan pesanan melalui halaman Riwayat Booking.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <Link
            href={bookingHistoryHref}
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-4 text-[16px] text-white transition hover:bg-black/86"
          >
            Lihat Riwayat Booking
          </Link>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-6 py-4 text-[16px] text-black transition hover:bg-black hover:text-white"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
