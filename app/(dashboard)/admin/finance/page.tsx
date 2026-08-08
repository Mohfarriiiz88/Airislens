"use client";

import { useEffect, useState } from "react";

import { formatBookingTimeWindow } from "@/lib/booking-time";

type PartnerWallet = {
  availableBalance: number;
  pendingWithdrawalBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
};

type EscrowSummary = {
  unpaidCount: number;
  heldCount: number;
  readyCount: number;
  releasedCount: number;
  heldAmount: number;
  readyAmount: number;
  releasedAmount: number;
};

type PartnerSettlement = {
  id: number;
  bookingId: number;
  orderId: string;
  customerName: string;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string | null;
  grossAmount: number;
  commissionAmount: number;
  netPartnerAmount: number;
  status: string;
  heldAt: string | null;
  releasedAt: string | null;
};

type WalletTransaction = {
  id: number;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

type WithdrawalRequest = {
  id: number;
  requestedAmount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  transferReference: string | null;
  adminNote: string | null;
};

type FinanceOverview = {
  wallet: PartnerWallet;
  escrow: EscrowSummary;
  settlements: PartnerSettlement[];
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
};

const INITIAL_FORM = {
  requestedAmount: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBookingSchedule(
  date: string,
  time: string,
  endTime?: string | null
) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} - ${formatBookingTimeWindow(time, endTime)}`;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "released":
    case "paid":
      return "bg-green-500/15 text-green-700";
    case "held":
    case "approved":
      return "bg-blue-500/15 text-blue-700";
    case "ready_to_release":
    case "processing":
      return "bg-purple-500/15 text-purple-700";
    case "rejected":
    case "refunded":
    case "cancelled":
      return "bg-red-500/15 text-red-700";
    default:
      return "bg-yellow-500/15 text-yellow-700";
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: "Belum Dibayar",
    held: "Ditahan Escrow",
    ready_to_release: "Siap Dirilis",
    released: "Masuk Dompet",
    refunded: "Refund",
    partial_refunded: "Partial Refund",
    pending: "Menunggu",
    approved: "Disetujui",
    processing: "Diproses",
    paid: "Dibayar",
    rejected: "Ditolak",
    failed: "Gagal",
    cancelled: "Dibatalkan",
  };

  return labels[status] ?? status;
}

export default function AdminFinancePage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  async function loadOverview() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/finance", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        message?: string;
        overview?: FinanceOverview;
      };

      if (!response.ok || !result.overview) {
        throw new Error(result.message || "Gagal memuat data keuangan.");
      }

      setOverview(result.overview);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat data keuangan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setIsError(false);
      setMessage("");

      const response = await fetch("/api/admin/finance/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestedAmount: form.requestedAmount,
          bankName: form.bankName,
          accountName: form.accountName,
          accountNumber: form.accountNumber,
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Gagal membuat permintaan pencairan.");
      }

      setForm(INITIAL_FORM);
      setMessage(result.message || "Permintaan pencairan berhasil dikirim.");
      await loadOverview();
    } catch (error) {
      setIsError(true);
      setMessage(
          error instanceof Error ? error.message : "Gagal membuat permintaan pencairan."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] text-black">Keuangan</h1>
        <p className="text-lg text-black">
          Pantau escrow, saldo dompet, dan ajukan pencairan saldo mitra.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-500/20 bg-red-500/10 text-red-700"
              : "border-green-500/20 bg-green-500/10 text-green-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {loading || !overview ? (
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-black/50">
          Memuat data keuangan...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Saldo Tersedia"
              value={formatCurrency(overview.wallet.availableBalance)}
            />
            <StatCard
              title="Saldo Ditahan untuk Pencairan"
              value={formatCurrency(overview.wallet.pendingWithdrawalBalance)}
            />
            <StatCard
              title="Total Masuk Dompet"
              value={formatCurrency(overview.wallet.totalEarned)}
            />
            <StatCard
              title="Total Dicairkan"
              value={formatCurrency(overview.wallet.totalWithdrawn)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                    Escrow
                  </p>
                  <h2 className="mt-2 text-2xl text-black">
                    Ringkasan dana booking
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <EscrowCard
                  title="Ditahan"
                  subtitle={`${overview.escrow.heldCount} booking`}
                  value={formatCurrency(overview.escrow.heldAmount)}
                />
                <EscrowCard
                  title="Siap Dirilis"
                  subtitle={`${overview.escrow.readyCount} booking`}
                  value={formatCurrency(overview.escrow.readyAmount)}
                />
                <EscrowCard
                  title="Sudah Dirilis"
                  subtitle={`${overview.escrow.releasedCount} booking`}
                  value={formatCurrency(overview.escrow.releasedAmount)}
                />
              </div>

              <div className="mt-6 text-sm text-black/55">
                Booking belum dibayar: {overview.escrow.unpaidCount}
              </div>
            </section>

            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                Pencairan
              </p>
              <h2 className="mt-2 text-2xl text-black">Ajukan pencairan</h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Field
                  label="Nominal Pencairan"
                  type="number"
                  min="1"
                  value={form.requestedAmount}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, requestedAmount: value }))
                  }
                  placeholder="500000"
                />
                <Field
                  label="Nama Bank"
                  value={form.bankName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, bankName: value }))
                  }
                  placeholder="BCA"
                />
                <Field
                  label="Nama Pemilik Rekening"
                  value={form.accountName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, accountName: value }))
                  }
                  placeholder="Nama lengkap"
                />
                <Field
                  label="Nomor Rekening"
                  value={form.accountNumber}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, accountNumber: value }))
                  }
                  placeholder="1234567890"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Mengirim..." : "Ajukan Pencairan"}
                </button>
              </form>
            </section>
          </div>

          <section className="rounded-[28px] border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                Pencairan
                </p>
                <h2 className="mt-2 text-2xl text-black">Riwayat pencairan</h2>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-black/50">
                  <tr>
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Nominal</th>
                    <th className="pb-3">Rekening</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Diajukan</th>
                    <th className="pb-3">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.withdrawals.length > 0 ? (
                    overview.withdrawals.map((item) => (
                      <tr key={item.id} className="border-t border-black/10">
                        <td className="py-4 font-medium">#{item.id}</td>
                        <td className="py-4">
                          {formatCurrency(item.requestedAmount)}
                        </td>
                        <td className="py-4">
                          <div>{item.bankName}</div>
                          <div className="text-black/45">
                            {item.accountName} - {item.accountNumber}
                          </div>
                        </td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass(
                              item.status
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-4">{formatDate(item.requestedAt)}</td>
                        <td className="py-4 text-black/55">
                          {item.adminNote || item.transferReference || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-black/40">
                        Belum ada pencairan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                Penyelesaian Dana
              </p>
              <h2 className="mt-2 text-2xl text-black">Booking terbaru</h2>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-black/50">
                    <tr>
                      <th className="pb-3">Order</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Jadwal</th>
                      <th className="pb-3">Pendapatan Bersih Mitra</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.settlements.length > 0 ? (
                      overview.settlements.map((item) => (
                        <tr key={item.id} className="border-t border-black/10">
                          <td className="py-4 font-medium">{item.orderId}</td>
                          <td className="py-4">{item.customerName}</td>
                          <td className="py-4">
                            {formatBookingSchedule(
                              item.bookingDate,
                              item.bookingTime,
                              item.bookingEndTime
                            )}
                          </td>
                          <td className="py-4">
                            <div>{formatCurrency(item.netPartnerAmount)}</div>
                            <div className="text-black/45">
                              Komisi {formatCurrency(item.commissionAmount)}
                            </div>
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-black/40">
                          Belum ada data penyelesaian dana.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                Riwayat Saldo
              </p>
              <h2 className="mt-2 text-2xl text-black">Mutasi saldo</h2>

              <div className="mt-6 space-y-3">
                {overview.transactions.length > 0 ? (
                  overview.transactions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-black/10 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-black">
                            {item.description}
                          </div>
                          <div className="mt-1 text-xs text-black/45">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <div
                          className={
                            item.direction === "credit"
                              ? "text-sm font-medium text-green-700"
                              : "text-sm font-medium text-red-700"
                          }
                        >
                          {item.direction === "credit" ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-black/45">
                        <span>{item.type}</span>
                        <span>Saldo akhir {formatCurrency(item.balanceAfter)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-black/40">
                    Belum ada mutasi saldo.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="text-sm text-black/50">{title}</div>
      <div className="mt-2 text-2xl font-medium text-black">{value}</div>
    </div>
  );
}

function EscrowCard({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
      <div className="text-sm text-black/45">{title}</div>
      <div className="mt-1 text-xs text-black/35">{subtitle}</div>
      <div className="mt-4 text-xl font-medium text-black">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-black">{label}</span>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-black/15 px-4 py-3 text-sm"
      />
    </label>
  );
}

