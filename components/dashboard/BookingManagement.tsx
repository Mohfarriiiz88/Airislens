"use client";

import { useMemo, useState } from "react";

import {
  getAdminBookingStatusLabel,
  getBookingLifecycleLabel,
  getBookingLifecycleStatus,
  type AdminBooking,
  type AdminBookingStatus,
  type BookingLifecycleStatus,
} from "@/lib/bookings.shared";
import { formatBookingTimeWindow } from "@/lib/booking-time";

type BookingManagementProps = {
  bookings: AdminBooking[];
};

type StatusFilter =
  | "All"
  | "AwaitingPayment"
  | "Scheduled"
  | "AwaitingCustomerConfirmation"
  | "Completed"
  | "Cancelled";

function formatDate(date: string, time: string, endTime?: string | null) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} - ${formatBookingTimeWindow(time, endTime)}`;
}

function getStatusOptions(status: AdminBookingStatus) {
  const options: Record<AdminBookingStatus, AdminBookingStatus[]> = {
    Pending: ["Pending", "Confirmed", "Cancelled"],
    Confirmed: [
      "Confirmed",
      "InProgress",
      "AwaitingConfirmation",
      "Cancelled",
    ],
    InProgress: ["InProgress", "AwaitingConfirmation", "Cancelled"],
    AwaitingConfirmation: ["AwaitingConfirmation"],
    Completed: ["Completed"],
    Cancelled: ["Cancelled"],
    Disputed: ["Disputed"],
    Refunded: ["Refunded"],
  };

  return options[status];
}

function getPhotographerBookingValue(booking: AdminBooking) {
  if (booking.packagePrice !== null) {
    return booking.packagePrice + booking.transportFee;
  }

  return Math.max(0, (booking.totalPrice ?? booking.amount) - booking.serviceFee);
}

export default function BookingManagement({
  bookings,
}: BookingManagementProps) {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [editingStatus, setEditingStatus] = useState<
    Record<number, AdminBookingStatus>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filteredData = useMemo(() => {
    return bookingRows.filter((booking) => {
      const keyword = search.trim().toLowerCase();
      const matchSearch =
        !keyword ||
        booking.customerName.toLowerCase().includes(keyword) ||
        booking.packageName.toLowerCase().includes(keyword) ||
        booking.location.toLowerCase().includes(keyword) ||
        booking.orderId.toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "All" || booking.lifecycleStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [bookingRows, search, statusFilter]);

  const handleSaveStatus = async (bookingId: number) => {
    const nextStatus =
      editingStatus[bookingId] ??
      bookingRows.find((booking) => booking.id === bookingId)?.status;

    if (!nextStatus) {
      return;
    }

    setSavingId(bookingId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "Gagal memperbarui status booking.");
      }

      setBookingRows((current) =>
        current.map((booking) => {
          if (booking.id !== bookingId) {
            return booking;
          }

          const serviceCompletedAt =
            nextStatus === "AwaitingConfirmation" || nextStatus === "Completed"
              ? booking.serviceCompletedAt ?? new Date().toISOString()
              : booking.serviceCompletedAt;
          const customerConfirmedAt =
            nextStatus === "Completed"
              ? booking.customerConfirmedAt ?? new Date().toISOString()
              : booking.customerConfirmedAt;
          const cancelledAt =
            nextStatus === "Cancelled" || nextStatus === "Refunded"
              ? booking.cancelledAt ?? new Date().toISOString()
              : booking.cancelledAt;
          const lifecycleStatus = getBookingLifecycleStatus({
            status: nextStatus,
            customerConfirmedAt,
          });

          return {
            ...booking,
            status: nextStatus,
            lifecycleStatus,
            lifecycleStatusLabel: getBookingLifecycleLabel(lifecycleStatus),
            serviceCompletedAt,
            customerConfirmedAt,
            cancelledAt,
          };
        })
      );

      setEditingStatus((current) => {
        const next = { ...current };
        delete next[bookingId];
        return next;
      });
      setFeedback({
        type: "success",
        message: data?.message || "Status booking berhasil diperbarui.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal menyimpan status.",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-normal text-black">
          Booking Management
        </h1>
        <p className="text-lg text-black">
          Kelola seluruh booking pelanggan Anda
        </p>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-700"
              : "border-red-500/20 bg-red-500/10 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Cari nama, paket, lokasi, atau order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 rounded-xl border border-black/20 bg-[#ffffff] px-4 py-2 text-sm text-black outline-none focus:border-black"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-black/20 bg-[#ffffff] px-4 py-2 text-sm text-black outline-none focus:border-black"
        >
          <option value="All">Semua Status</option>
          <option value="AwaitingPayment">Menunggu Pembayaran</option>
          <option value="Scheduled">Dijadwalkan</option>
          <option value="AwaitingCustomerConfirmation">
            Menunggu Konfirmasi Customer
          </option>
          <option value="Completed">Selesai</option>
          <option value="Cancelled">Dibatalkan</option>
        </select>
      </div>

      <div className="rounded-2xl border border-black/20 bg-[#ffffff] overflow-hidden">
        <table className="w-full text-sm text-left text-black">
          <thead className="bg-[#ffffff] text-black">
            <tr>
              <th className="font-medium px-6 py-4">Order ID</th>
              <th className="font-medium px-6 py-4">Nama</th>
              <th className="font-medium px-6 py-4">Paket</th>
              <th className="font-medium px-6 py-4">Tanggal</th>
              <th className="font-medium px-6 py-4">Lokasi</th>
              <th className="font-medium px-6 py-4">Status</th>
              <th className="font-medium px-6 py-4">Hak Fotografer</th>
              <th className="font-medium px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((booking) => (
              <tr
                key={booking.id}
                className="border-t border-black/20 hover:bg-black/[0.03] transition"
              >
                <td className="px-6 py-4">{booking.orderId}</td>
                <td className="px-6 py-4">{booking.customerName}</td>
                <td className="px-6 py-4">{booking.packageName}</td>
                <td className="px-6 py-4">
                  {formatDate(
                    booking.bookingDate,
                    booking.bookingTime,
                    booking.bookingEndTime
                  )}
                </td>
                <td className="px-6 py-4">{booking.location || "-"}</td>
                <td className="px-6 py-4">
                  <StatusBadge
                    status={booking.lifecycleStatus}
                    label={booking.lifecycleStatusLabel}
                  />
                </td>
                <td className="px-6 py-4">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(getPhotographerBookingValue(booking))}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={editingStatus[booking.id] ?? booking.status}
                      onChange={(e) =>
                        setEditingStatus((current) => ({
                          ...current,
                          [booking.id]: e.target.value as AdminBookingStatus,
                        }))
                      }
                      className="rounded-lg border border-black/20 bg-white px-3 py-2 text-xs text-black outline-none focus:border-black"
                    >
                      {getStatusOptions(booking.status).map((option) => (
                        <option key={option} value={option}>
                          {getAdminBookingStatusLabel(option)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleSaveStatus(booking.id)}
                      disabled={savingId === booking.id}
                      className="rounded-lg border border-black/20 px-3 py-2 text-xs text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingId === booking.id ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-black/50"
                >
                  Tidak ada data booking
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: BookingLifecycleStatus;
  label: string;
}) {
  const base = "px-3 py-1 rounded-full text-xs font-medium";

  const styles: Record<BookingLifecycleStatus, string> = {
    AwaitingPayment: "bg-yellow-500/20 text-yellow-700",
    Scheduled: "bg-blue-500/20 text-blue-700",
    AwaitingCustomerConfirmation: "bg-amber-500/20 text-amber-700",
    Completed: "bg-green-500/20 text-green-700",
    Cancelled: "bg-red-500/20 text-red-700",
  };

  return <span className={`${base} ${styles[status]}`}>{label}</span>;
}
