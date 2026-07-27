"use client";

import { useMemo, useState } from "react";

import {
  getBookingLifecycleLabel,
  type UserBookingHistoryItem,
} from "@/lib/bookings.shared";
import { formatBookingTimeWindow } from "@/lib/booking-time";

type BookingHistoryProps = {
  bookings: UserBookingHistoryItem[];
};

const tabs = [
  "All",
  "AwaitingPayment",
  "Scheduled",
  "AwaitingCustomerConfirmation",
  "Completed",
  "Cancelled",
] as const;

function formatDate(date: string, time: string, endTime?: string | null) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} - ${formatBookingTimeWindow(time, endTime)}`;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BookingHistory({ bookings }: BookingHistoryProps) {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("All");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (activeTab === "All") {
      return bookingRows;
    }

    return bookingRows.filter((booking) => booking.lifecycleStatus === activeTab);
  }, [activeTab, bookingRows]);

  async function handleConfirmCompletion(bookingId: number) {
    try {
      setSavingId(bookingId);
      setFeedback(null);

      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: "PATCH",
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.message || "Gagal mengonfirmasi booking.");
      }

      const confirmedAt = new Date().toISOString();

      setBookingRows((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                customerConfirmedAt: confirmedAt,
                lifecycleStatus: "Completed",
                lifecycleStatusLabel: getBookingLifecycleLabel("Completed"),
                canConfirmCompletion: false,
              }
            : booking
        )
      );
      setFeedback({
        type: "success",
        message:
          result?.message ||
          "Booking selesai berhasil dikonfirmasi dan dana dirilis ke partner.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal mengonfirmasi booking.",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleRefundRequest(bookingId: number) {
    try {
      setSavingId(bookingId);
      setFeedback(null);

      const response = await fetch(`/api/bookings/${bookingId}/refund-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Customer mengajukan refund dari halaman booking history.",
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.message || "Gagal mengajukan refund.");
      }

      setBookingRows((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                canRequestRefund: false,
                refundRequestStatus: "open",
              }
            : booking
        )
      );
      setFeedback({
        type: "success",
        message:
          result?.message ||
          "Permintaan refund berhasil dikirim untuk ditinjau superadmin.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal mengajukan refund.",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleCancelBooking(bookingId: number) {
    try {
      setSavingId(bookingId);
      setFeedback(null);

      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Customer membatalkan booking dari halaman booking history.",
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string; canRequestRefund?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(result?.message || "Gagal membatalkan booking.");
      }

      setBookingRows((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: "Cancelled",
                lifecycleStatus: "Cancelled",
                lifecycleStatusLabel: getBookingLifecycleLabel("Cancelled"),
                canCancelBooking: false,
                canConfirmCompletion: false,
                canRequestRefund: result?.canRequestRefund === true,
              }
            : booking
        )
      );
      setFeedback({
        type: "success",
        message: result?.message || "Booking berhasil dibatalkan.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal membatalkan booking.",
      });
    } finally {
      setSavingId(null);
    }
  }

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
            {tab === "All" ? "Semua" : getBookingLifecycleLabel(tab)}
          </button>
        ))}
      </div>

      {feedback ? (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-700"
              : "border-red-500/20 bg-red-500/10 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

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
                  Shooting Date:{" "}
                  {formatDate(
                    item.bookingDate,
                    item.bookingTime,
                    item.bookingEndTime
                  )}
                </p>

                <p className="text-[15px] text-black/55">
                  Location: {item.eventAddress || item.location || "Lokasi belum diisi"}
                </p>

                {item.lifecycleStatus === "AwaitingCustomerConfirmation" ||
                item.lifecycleStatus === "Completed" ? (
                  <p className="text-[14px] text-black/60">
                    {item.customerConfirmedAt
                      ? "Sesi telah Anda konfirmasi selesai."
                      : item.serviceCompletedAt
                        ? "Partner menandai sesi selesai. Silakan konfirmasi untuk merilis dana."
                        : "Menunggu partner menyelesaikan sesi."}
                  </p>
                ) : null}

                {item.refundRequestStatus ? (
                  <p className="text-[14px] text-black/60">
                    Status refund: {getRefundStatusLabel(item.refundRequestStatus)}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col md:items-end justify-between gap-3">
                <p
                  className={`text-[16px] ${
                    item.lifecycleStatus === "Completed"
                      ? "text-green-600"
                      : item.lifecycleStatus === "Cancelled"
                        ? "text-red-600"
                        : item.lifecycleStatus === "Scheduled"
                          ? "text-blue-600"
                          : item.lifecycleStatus ===
                              "AwaitingCustomerConfirmation"
                            ? "text-amber-600"
                            : "text-yellow-600"
                  }`}
                >
                  {item.lifecycleStatusLabel}
                </p>

                <p className="text-[18px] text-black">
                  {formatPrice(item.totalPrice ?? item.amount)}
                </p>

                {item.canConfirmCompletion ? (
                  <button
                    type="button"
                    onClick={() => void handleConfirmCompletion(item.id)}
                    disabled={savingId === item.id}
                    className="rounded-full bg-black px-4 py-2 text-[13px] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === item.id
                      ? "Mengonfirmasi..."
                      : "Konfirmasi Selesai"}
                    </button>
                ) : null}

                {item.canCancelBooking ? (
                  <button
                    type="button"
                    onClick={() => void handleCancelBooking(item.id)}
                    disabled={savingId === item.id}
                    className="rounded-full border border-black/15 bg-white px-4 py-2 text-[13px] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === item.id ? "Membatalkan..." : "Batalkan Booking"}
                  </button>
                ) : null}

                {item.canRequestRefund ? (
                  <button
                    type="button"
                    onClick={() => void handleRefundRequest(item.id)}
                    disabled={savingId === item.id}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === item.id ? "Mengirim..." : "Ajukan Refund"}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function getRefundStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Menunggu review superadmin",
    reviewing: "Sedang direview",
    resolved_refund: "Refund disetujui",
    resolved_partial_refund: "Partial refund disetujui",
    resolved_release: "Dana tetap dirilis",
    rejected: "Refund ditolak",
  };

  return labels[status] ?? status;
}
