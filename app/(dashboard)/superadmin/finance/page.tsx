"use client";

import { useEffect, useState } from "react";

type FinanceSummary = {
  pendingWithdrawalCount: number;
  processingWithdrawalCount: number;
  pendingWithdrawalAmount: number;
  paidWithdrawalAmount: number;
  totalPartnerAvailableBalance: number;
  totalPartnerPendingWithdrawalBalance: number;
  escrowHeldAmount: number;
  escrowReadyAmount: number;
};

type WithdrawalItem = {
  id: number;
  partnerUserId: number;
  partnerName: string;
  partnerEmail: string;
  requestedAmount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  reviewedByUserId: number | null;
  transferReference: string | null;
  adminNote: string | null;
};

type RefundRequestItem = {
  id: number;
  bookingId: number;
  orderId: string;
  openedByUserId: number;
  customerName: string;
  customerEmail: string | null;
  photographerName: string;
  bookingDate: string;
  bookingTime: string;
  grossAmount: number;
  reason: string;
  status: string;
  resolution: string | null;
  resolvedByUserId: number | null;
  createdAt: string;
  resolvedAt: string | null;
};

type FinanceOverview = {
  summary: FinanceSummary;
  withdrawals: WithdrawalItem[];
  refundRequests: RefundRequestItem[];
};

type FilterStatus =
  | "all"
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected";

async function fetchFinanceOverview(filterStatus: FilterStatus) {
  const query =
    filterStatus === "all"
      ? ""
      : `?status=${encodeURIComponent(filterStatus)}`;
  const response = await fetch(`/api/superadmin/finance${query}`, {
    cache: "no-store",
  });
  const result = (await response.json()) as {
    message?: string;
    overview?: FinanceOverview;
  };

  if (!response.ok || !result.overview) {
    throw new Error(result.message || "Gagal memuat data finance.");
  }

  return result.overview;
}

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

function statusBadgeClass(status: string) {
  switch (status) {
    case "paid":
    case "resolved_refund":
      return "bg-green-500/15 text-green-700";
    case "approved":
      return "bg-blue-500/15 text-blue-700";
    case "processing":
    case "reviewing":
    case "resolved_partial_refund":
      return "bg-purple-500/15 text-purple-700";
    case "rejected":
    case "failed":
    case "cancelled":
    case "resolved_release":
      return "bg-red-500/15 text-red-700";
    default:
      return "bg-yellow-500/15 text-yellow-700";
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
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

export default function SuperadminFinancePage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [transferReferences, setTransferReferences] = useState<
    Record<number, string>
  >({});
  const [refundResolutions, setRefundResolutions] = useState<
    Record<number, string>
  >({});

  async function loadOverview(currentFilter: FilterStatus) {
    try {
      setLoading(true);
      setOverview(await fetchFinanceOverview(currentFilter));
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Gagal memuat data finance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setOverview(await fetchFinanceOverview(filter));
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error ? error.message : "Gagal memuat data finance."
        );
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [filter]);

  async function handleAction(id: number, action: string) {
    try {
      setActionLoadingId(id);
      setIsError(false);
      setMessage("");

      const response = await fetch(`/api/superadmin/finance/withdrawals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          adminNote: adminNotes[id] || "",
          transferReference: transferReferences[id] || "",
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui withdrawal.");
      }

      setMessage(result.message || "Status withdrawal berhasil diperbarui.");
      await loadOverview(filter);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui withdrawal."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRefundAction(
    id: number,
    action: "approve" | "reject",
    mode: "auto" | "manual" = "auto"
  ) {
    try {
      setActionLoadingId(id);
      setIsError(false);
      setMessage("");

      const response = await fetch(`/api/superadmin/finance/refunds/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          mode,
          resolution: refundResolutions[id] || "",
        }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui refund request.");
      }

      setMessage(result.message || "Status refund request berhasil diperbarui.");
      await loadOverview(filter);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui refund request."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] text-black">Finance Control</h1>
        <p className="text-lg text-black">
          Verifikasi pencairan partner dan pantau saldo escrow AirisLens.
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
          Memuat data finance...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Withdrawal Pending"
              value={`${overview.summary.pendingWithdrawalCount} request`}
            />
            <StatCard
              title="Dana Pending Cair"
              value={formatCurrency(overview.summary.pendingWithdrawalAmount)}
            />
            <StatCard
              title="Saldo Wallet Partner"
              value={formatCurrency(overview.summary.totalPartnerAvailableBalance)}
            />
            <StatCard
              title="Sudah Dibayar"
              value={formatCurrency(overview.summary.paidWithdrawalAmount)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniCard
              label="Escrow Ditahan"
              value={formatCurrency(overview.summary.escrowHeldAmount)}
            />
            <MiniCard
              label="Escrow Siap Rilis"
              value={formatCurrency(overview.summary.escrowReadyAmount)}
            />
            <MiniCard
              label="Saldo Ditahan Withdraw"
              value={formatCurrency(
                overview.summary.totalPartnerPendingWithdrawalBalance
              )}
            />
            <MiniCard
              label="Withdrawal Diproses"
              value={`${overview.summary.processingWithdrawalCount} request`}
            />
          </div>

          <section className="rounded-[28px] border border-black/10 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                  Withdrawal Queue
                </p>
                <h2 className="mt-2 text-2xl text-black">
                  Antrian pencairan partner
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    "pending",
                    "approved",
                    "processing",
                    "paid",
                    "rejected",
                  ] satisfies FilterStatus[]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      filter === item
                        ? "bg-black text-white"
                        : "bg-black/5 text-black hover:bg-black/10"
                    }`}
                  >
                    {item === "all" ? "Semua" : statusLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="text-black/50">
                  <tr>
                    <th className="pb-3">Partner</th>
                    <th className="pb-3">Nominal</th>
                    <th className="pb-3">Rekening</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Waktu</th>
                    <th className="pb-3">Catatan Admin</th>
                    <th className="pb-3">Ref Transfer</th>
                    <th className="pb-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.withdrawals.length > 0 ? (
                    overview.withdrawals.map((item) => {
                      const isSubmitting = actionLoadingId === item.id;

                      return (
                        <tr key={item.id} className="border-t border-black/10 align-top">
                          <td className="py-4">
                            <div className="font-medium text-black">
                              {item.partnerName}
                            </div>
                            <div className="text-black/45">{item.partnerEmail}</div>
                            <div className="mt-1 text-xs text-black/35">
                              User #{item.partnerUserId} | WD #{item.id}
                            </div>
                          </td>
                          <td className="py-4 font-medium">
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
                          <td className="py-4 text-black/55">
                            <div>Ajukan: {formatDate(item.requestedAt)}</div>
                            <div>Review: {formatDate(item.reviewedAt)}</div>
                            <div>Paid: {formatDate(item.paidAt)}</div>
                          </td>
                          <td className="py-4">
                            <textarea
                              rows={3}
                              value={adminNotes[item.id] ?? item.adminNote ?? ""}
                              onChange={(event) =>
                                setAdminNotes((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value,
                                }))
                              }
                              className="w-[180px] rounded-xl border border-black/15 px-3 py-2 text-xs"
                              placeholder="Catatan admin"
                            />
                          </td>
                          <td className="py-4">
                            <input
                              value={
                                transferReferences[item.id] ??
                                item.transferReference ??
                                ""
                              }
                              onChange={(event) =>
                                setTransferReferences((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value,
                                }))
                              }
                              className="w-[160px] rounded-xl border border-black/15 px-3 py-2 text-xs"
                              placeholder="TRF-001"
                            />
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-2">
                              {item.status === "pending" ? (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(item.id, "approve")}
                                  className="rounded-xl bg-black px-3 py-2 text-xs text-white disabled:opacity-60"
                                >
                                  Approve
                                </button>
                              ) : null}

                              {(item.status === "pending" ||
                                item.status === "approved") && (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(item.id, "processing")}
                                  className="rounded-xl border border-black/15 px-3 py-2 text-xs text-black disabled:opacity-60"
                                >
                                  Processing
                                </button>
                              )}

                              {(item.status === "approved" ||
                                item.status === "processing") && (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(item.id, "paid")}
                                  className="rounded-xl bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                                >
                                  Mark Paid
                                </button>
                              )}

                              {["pending", "approved", "processing", "failed"].includes(
                                item.status
                              ) ? (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(item.id, "reject")}
                                  className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-black/40">
                        Tidak ada request withdrawal untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                  Refund Requests
                </p>
                <h2 className="mt-2 text-2xl text-black">
                  Permintaan refund booking
                </h2>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="text-black/50">
                  <tr>
                    <th className="pb-3">Booking</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Partner</th>
                    <th className="pb-3">Nominal</th>
                    <th className="pb-3">Alasan</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Resolusi</th>
                    <th className="pb-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.refundRequests.length > 0 ? (
                    overview.refundRequests.map((item) => {
                      const isSubmitting = actionLoadingId === item.id;

                      return (
                        <tr key={item.id} className="border-t border-black/10 align-top">
                          <td className="py-4">
                            <div className="font-medium text-black">{item.orderId}</div>
                            <div className="text-xs text-black/45">
                              Booking #{item.bookingId} | {item.bookingDate} | {item.bookingTime}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="font-medium text-black">{item.customerName}</div>
                            <div className="text-black/45">{item.customerEmail || "-"}</div>
                          </td>
                          <td className="py-4">{item.photographerName}</td>
                          <td className="py-4 font-medium">
                            {formatCurrency(item.grossAmount)}
                          </td>
                          <td className="py-4 text-black/60">{item.reason}</td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass(
                                item.status
                              )}`}
                            >
                              {refundStatusLabel(item.status)}
                            </span>
                          </td>
                          <td className="py-4">
                            <textarea
                              rows={3}
                              value={refundResolutions[item.id] ?? item.resolution ?? ""}
                              onChange={(event) =>
                                setRefundResolutions((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value,
                                }))
                              }
                              className="w-[220px] rounded-xl border border-black/15 bg-white px-3 py-2 text-xs text-black"
                              placeholder="Catatan keputusan refund"
                            />
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-2">
                              {item.status === "open" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() =>
                                      handleRefundAction(item.id, "approve", "auto")
                                    }
                                    className="rounded-xl bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-60"
                                  >
                                    Refund via Midtrans
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() =>
                                      handleRefundAction(item.id, "approve", "manual")
                                    }
                                    className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 disabled:opacity-60"
                                  >
                                    Tandai Manual
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleRefundAction(item.id, "reject")}
                                    className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : item.status === "reviewing" ? (
                                <span className="text-xs text-black/45">
                                  Refund sedang menunggu konfirmasi Midtrans.
                                </span>
                              ) : (
                                <span className="text-xs text-black/45">
                                  {item.resolvedAt
                                    ? `Selesai ${formatDate(item.resolvedAt)}`
                                    : "Tidak ada aksi lanjutan"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-black/40">
                        Tidak ada refund request.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
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

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-sm text-black/45">{label}</div>
      <div className="mt-2 text-lg font-medium text-black">{value}</div>
    </div>
  );
}

function refundStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Menunggu",
    reviewing: "Menunggu Midtrans",
    resolved_refund: "Refund Disetujui",
    resolved_partial_refund: "Partial Refund",
    resolved_release: "Dana Dirilis",
    rejected: "Ditolak",
  };

  return labels[status] ?? status;
}

