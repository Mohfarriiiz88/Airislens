"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type BookingCalendarItem,
  type BookingLifecycleStatus,
} from "@/lib/bookings.shared";
import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

type PartnerSchedule = {
  id: number;
  userId: number;
  title: string;
  date: string;
  time: string;
  location: string;
  note: string;
};

type ScheduleFormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  note: string;
};

const EMPTY_FORM: ScheduleFormState = {
  title: "",
  date: "",
  time: "",
  location: "",
  note: "",
};

function getTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00`));
}

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [schedules, setSchedules] = useState<PartnerSchedule[]>([]);
  const [bookings, setBookings] = useState<BookingCalendarItem[]>([]);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [modalUnavailableTimes, setModalUnavailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerSchedule | null>(null);
  const [form, setForm] = useState<ScheduleFormState>({
    ...EMPTY_FORM,
    date: getTodayDateString(),
  });

  const occupiedTimeSet = useMemo(
    () =>
      new Set(
        form.date === selectedDate ? unavailableTimes : modalUnavailableTimes
      ),
    [form.date, modalUnavailableTimes, selectedDate, unavailableTimes]
  );

  async function loadCalendar(date: string) {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/schedules?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
            schedules?: PartnerSchedule[];
            bookings?: BookingCalendarItem[];
            unavailableTimes?: string[];
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "Gagal memuat kalender jadwal.");
      }

      setSchedules(data?.schedules ?? []);
      setBookings(data?.bookings ?? []);
      setUnavailableTimes(data?.unavailableTimes ?? []);
      setIsError(false);
      setMessage("");
    } catch (error) {
      setSchedules([]);
      setBookings([]);
      setUnavailableTimes([]);
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendar(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!open || !form.date) {
      setModalUnavailableTimes([]);
      return;
    }

    if (form.date === selectedDate) {
      setModalUnavailableTimes([]);
      return;
    }

    let ignore = false;

    const fetchAvailability = async () => {
      try {
        const response = await fetch(
          `/api/admin/schedules?date=${encodeURIComponent(form.date)}`,
          {
            cache: "no-store",
          }
        );
        const data = (await response.json().catch(() => null)) as
          | { unavailableTimes?: string[] }
          | null;

        if (!response.ok) {
          throw new Error();
        }

        if (!ignore) {
          setModalUnavailableTimes(data?.unavailableTimes ?? []);
        }
      } catch {
        if (!ignore) {
          setModalUnavailableTimes([]);
        }
      }
    };

    void fetchAvailability();

    return () => {
      ignore = true;
    };
  }, [form.date, open, selectedDate]);

  function resetForm(nextDate = selectedDate) {
    setForm({
      ...EMPTY_FORM,
      date: nextDate,
    });
    setEditing(null);
  }

  function openCreate() {
    resetForm(selectedDate);
    setOpen(true);
  }

  function openEdit(schedule: PartnerSchedule) {
    setEditing(schedule);
    setForm({
      title: schedule.title,
      date: schedule.date,
      time: schedule.time,
      location: schedule.location,
      note: schedule.note,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title || !form.date || !form.time) {
      setIsError(true);
      setMessage("Judul, tanggal, dan jam wajib diisi.");
      return;
    }

    setSaving(true);
    setIsError(false);
    setMessage("");

    try {
      const endpoint = editing
        ? `/api/admin/schedules/${editing.id}`
        : "/api/admin/schedules";
      const method = editing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "Gagal menyimpan jadwal.");
      }

      setOpen(false);
      resetForm(form.date);
      setModalUnavailableTimes([]);
      if (form.date === selectedDate) {
        await loadCalendar(form.date);
      } else {
        setSelectedDate(form.date);
      }
      setIsError(false);
      setMessage(data?.message || "Jadwal berhasil disimpan.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung ke server."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(schedule: PartnerSchedule) {
    if (!confirm("Hapus jadwal ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/schedules/${schedule.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "Gagal menghapus jadwal.");
      }

      setOpen(false);
      resetForm(schedule.date);
      setModalUnavailableTimes([]);
      if (schedule.date === selectedDate) {
        await loadCalendar(schedule.date);
      } else {
        setSelectedDate(schedule.date);
      }
      setIsError(false);
      setMessage(data?.message || "Jadwal berhasil dihapus.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Tidak dapat terhubung ke server."
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[40px] font-normal text-black">Jadwal</h1>
          <p className="text-lg text-black">
            Kelola slot jadwal fotografer dan pantau booking pada tanggal terpilih.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-white px-4 py-2 text-sm text-black hover:opacity-90"
        >
          + Tambah Jadwal
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-500/20 bg-red-500/10 text-red-600"
              : "border-green-500/20 bg-green-500/10 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/20 bg-white p-5">
            <p className="mb-2 text-sm text-black/60">Tanggal</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black"
            />
            <p className="mt-3 text-sm text-black/60">
              {formatDateLabel(selectedDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-black/20 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-black">Slot Terisi</p>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                {unavailableTimes.length} slot
              </span>
            </div>

            {unavailableTimes.length === 0 ? (
              <p className="text-sm text-black/50">
                Belum ada slot yang terblokir pada tanggal ini.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unavailableTimes.map((time) => (
                  <span
                    key={time}
                    className="rounded-full bg-black px-3 py-1 text-xs text-white"
                  >
                    {time}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-black/20 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-black">Jadwal Manual</h2>
                <p className="text-sm text-black/60">
                  Slot yang Anda blok manual untuk tanggal ini.
                </p>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                {schedules.length} item
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-black/50">Memuat jadwal...</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-black/50">
                Belum ada jadwal manual pada tanggal ini.
              </p>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <article
                    key={schedule.id}
                    className="rounded-xl border border-black/10 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-medium text-black">
                          {schedule.time} - {schedule.title}
                        </p>
                        <p className="text-sm text-black/60">
                          {schedule.location || "Lokasi belum diisi"}
                        </p>
                        {schedule.note && (
                          <p className="text-sm text-black/70">{schedule.note}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(schedule)}
                          className="rounded-lg border border-black/20 px-3 py-2 text-xs text-black transition hover:bg-black/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(schedule)}
                          className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-600 transition hover:bg-red-500/10"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-black/20 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-black">Booking Masuk</h2>
                <p className="text-sm text-black/60">
                  Booking pelanggan yang sudah memakai slot pada tanggal ini.
                </p>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                {bookings.length} booking
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-black/50">Memuat booking...</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-black/50">
                Belum ada booking pada tanggal ini.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-xl border border-black/10 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-medium text-black">
                          {booking.bookingTime} - {booking.packageName}
                        </p>
                        <p className="text-sm text-black/70">
                          {booking.customerName} -{" "}
                          {booking.location || "Lokasi belum diisi"}
                        </p>
                        <p className="text-xs text-black/50">
                          Order ID: {booking.orderId}
                        </p>
                      </div>

                      <StatusPill
                        status={booking.lifecycleStatus}
                        label={booking.lifecycleStatusLabel}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-black/20 bg-[#f5f5f5] p-6">
            <h2 className="mb-4 text-lg font-medium text-black">
              {editing ? "Edit Jadwal" : "Tambah Jadwal"}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Judul jadwal"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none"
                />

                <select
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none"
                >
                  <option value="">Pilih jam</option>
                  {BOOKING_TIME_SLOTS.map((time) => {
                    const isEditingCurrentSlot =
                      editing?.date === form.date && editing?.time === time;

                    return (
                      <option
                        key={time}
                        value={time}
                        disabled={occupiedTimeSet.has(time) && !isEditingCurrentSlot}
                      >
                        {time}
                      </option>
                    );
                  })}
                </select>
              </div>

              <input
                placeholder="Lokasi"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none"
              />

              <textarea
                placeholder="Catatan"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                className="min-h-[100px] w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none"
              />

              {occupiedTimeSet.size > 0 && (
                <p className="text-xs text-black/50">
                  Slot terisi pada tanggal yang dipilih: {Array.from(occupiedTimeSet).join(", ")}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm(selectedDate);
                  setModalUnavailableTimes([]);
                }}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm text-black transition hover:bg-black/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-70"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  status,
  label,
}: {
  status: BookingLifecycleStatus;
  label: string;
}) {
  const styles: Record<BookingLifecycleStatus, string> = {
    AwaitingPayment: "bg-yellow-500/15 text-yellow-700",
    Scheduled: "bg-blue-500/15 text-blue-700",
    AwaitingCustomerConfirmation: "bg-amber-500/15 text-amber-700",
    Completed: "bg-green-500/15 text-green-700",
    Cancelled: "bg-red-500/15 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}
