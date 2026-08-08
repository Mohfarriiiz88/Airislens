"use client";

import { useEffect, useState } from "react";

import {
  getPartnerTypeLabel,
  type PartnerApplicationKind,
  type PartnerApplicationStatus,
} from "@/lib/partner-application-shared";

type Application = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  partnerType: PartnerApplicationKind;
  domicileCity: string;
  address: string;
  brandName: string;
  services: string[];
  experience: string;
  instagramUrl: string;
  portfolioUrl: string;
  about: string;
  mapsUrl: string | null;
  websiteUrl: string | null;
  establishedYear: number | null;
  studioPhone: string;
  declarationAccepted: boolean;
  declarations: string[];
  declarationAcceptedAt: string | null;
  termsAccepted: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  bankName: string;
  bankAccountNumber: string;
  cvFileUrl: string;
  status: PartnerApplicationStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  createdAt: string;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    void fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/partner-applications", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        message?: string;
        applications?: Application[];
      };

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data pengajuan.");
      }

      setApplications(result.applications ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Terjadi kesalahan saat memuat pengajuan."
      );
    } finally {
      setLoading(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filteredApplications = !query
    ? applications
    : applications.filter((item) => {
        const serviceText = item.services.join(" ").toLowerCase();
        return (
          item.applicantName.toLowerCase().includes(query) ||
          item.applicantEmail.toLowerCase().includes(query) ||
          item.domicileCity.toLowerCase().includes(query) ||
          item.brandName.toLowerCase().includes(query) ||
          serviceText.includes(query)
        );
      });

  function applyReviewedApplication(application: Application) {
    setApplications((prev) =>
      prev.map((item) => (item.id === application.id ? application : item))
    );
    setSelected((prev) => (prev?.id === application.id ? application : prev));
  }

  async function handleApprove(application: Application) {
    try {
      setActionLoadingId(application.id);
      setMessage(null);

      const response = await fetch(
        `/api/superadmin/partner-applications/${application.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "approved" }),
        }
      );
      const result = (await response.json()) as {
        message?: string;
        application?: Application;
      };

      if (!response.ok || !result.application) {
        throw new Error(result.message || "Gagal menyetujui pengajuan.");
      }

      applyReviewedApplication(result.application);
      setMessage({
        type: "success",
        text: result.message || "Pengajuan berhasil disetujui.",
      });
    } catch (approveError) {
      setMessage({
        type: "error",
        text:
          approveError instanceof Error
            ? approveError.message
            : "Terjadi kesalahan saat menyetujui pengajuan.",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject() {
    if (!rejecting) {
      return;
    }

    try {
      setActionLoadingId(rejecting.id);
      setMessage(null);

      const response = await fetch(
        `/api/superadmin/partner-applications/${rejecting.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "rejected",
            rejectionReason,
          }),
        }
      );
      const result = (await response.json()) as {
        message?: string;
        application?: Application;
      };

      if (!response.ok || !result.application) {
        throw new Error(result.message || "Gagal menolak pengajuan.");
      }

      applyReviewedApplication(result.application);
      setRejecting(null);
      setRejectionReason("");
      setMessage({
        type: "success",
        text: result.message || "Pengajuan berhasil ditolak.",
      });
    } catch (rejectError) {
      setMessage({
        type: "error",
        text:
          rejectError instanceof Error
            ? rejectError.message
            : "Terjadi kesalahan saat menolak pengajuan.",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] text-black">Pengajuan Mitra</h1>
        <p className="text-lg text-black">
          Tinjau verifikasi mitra secara manual sebelum memberikan akses
          fotografer.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-700"
              : "border-red-500/20 bg-red-500/10 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Cari nama, email, domisili, brand, atau layanan..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none md:w-[440px]"
        />
        <button
          type="button"
          onClick={() => void fetchApplications()}
          className="rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black transition hover:bg-black hover:text-white"
        >
          Muat Ulang
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
        <table className="w-full text-left text-sm text-black">
          <thead className="bg-black/[0.02] text-black/55">
            <tr>
              <th className="px-6 py-4 font-medium">Pendaftar</th>
              <th className="px-6 py-4 font-medium">Jenis Mitra</th>
              <th className="px-6 py-4 font-medium">Layanan</th>
              <th className="px-6 py-4 font-medium">Tanggal Pengajuan</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-black/40">
                  Memuat data pengajuan...
                </td>
              </tr>
            ) : filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-black/40">
                  Tidak ada pengajuan yang cocok.
                </td>
              </tr>
            ) : (
              filteredApplications.map((application) => {
                const isBusy = actionLoadingId === application.id;

                return (
                  <tr
                    key={application.id}
                    className="border-t border-black/10 align-top transition hover:bg-black/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">
                        {application.applicantName}
                      </div>
                      <div className="mt-1 text-black/55">
                        {application.applicantEmail}
                      </div>
                      <div className="mt-1 text-xs text-black/40">
                        {application.applicantPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">
                        {getPartnerTypeLabel(application.partnerType)}
                      </div>
                      <div className="mt-1 text-xs text-black/45">
                        {application.brandName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-black/70">
                      {application.services.length > 0
                        ? application.services.join(", ")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-black/70">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={application.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(application)}
                          className="rounded-xl border border-black/15 px-3 py-2 text-xs text-black transition hover:bg-black hover:text-white"
                        >
                          Detail
                        </button>
                        {application.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleApprove(application)}
                              className="rounded-xl bg-black px-3 py-2 text-xs text-white disabled:opacity-60"
                            >
                              {isBusy ? "Memproses..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejecting(application);
                                setRejectionReason("");
                              }}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <ApplicationDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onApprove={() => void handleApprove(selected)}
          onReject={() => {
            setRejecting(selected);
            setRejectionReason("");
          }}
          actionLoading={actionLoadingId === selected.id}
        />
      ) : null}

      {rejecting ? (
        <RejectModal
          application={rejecting}
          rejectionReason={rejectionReason}
          onReasonChange={setRejectionReason}
          onClose={() => {
            if (actionLoadingId === rejecting.id) {
              return;
            }
            setRejecting(null);
            setRejectionReason("");
          }}
          onSubmit={() => void handleReject()}
          loading={actionLoadingId === rejecting.id}
        />
      ) : null}
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}: {
  application: Application;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/40">
              Detail Verifikasi
            </p>
            <h2 className="mt-2 text-2xl text-black">
              {application.applicantName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={application.status} />
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
                {getPartnerTypeLabel(application.partnerType)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {application.status === "pending" ? (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={onApprove}
                  className="rounded-xl bg-black px-4 py-3 text-sm text-white disabled:opacity-60"
                >
                  {actionLoading ? "Memproses..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={onReject}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/15 px-4 py-3 text-sm text-black"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <DetailCard title="Informasi Pendaftar">
            <DetailRow label="Nama" value={application.applicantName} />
            <DetailRow label="Email" value={application.applicantEmail} />
            <DetailRow label="No. WhatsApp" value={application.applicantPhone} />
            <DetailRow label="Domisili / Kota" value={application.domicileCity} />
            <DetailRow label="Alamat" value={application.address} />
          </DetailCard>

          <DetailCard
            title={
              application.partnerType === "studio"
                ? "Informasi Studio"
                : "Informasi Fotografer"
            }
          >
            <DetailRow
              label={
                application.partnerType === "studio"
                  ? "Nama Studio"
                  : "Nama Profesional / Brand"
              }
              value={application.brandName || "-"}
            />
            <DetailRow
              label="Layanan / Spesialisasi"
              value={
                application.services.length > 0
                  ? application.services.join(", ")
                  : "-"
              }
            />
            <DetailRow label="Lama Pengalaman" value={application.experience} />
            <DetailRow label="Nama Bank" value={application.bankName || "-"} />
            <DetailRow
              label="Nomor Rekening"
              value={application.bankAccountNumber || "-"}
            />
            {application.partnerType === "studio" ? (
              <>
                <DetailRow
                  label="Tahun Berdiri"
                  value={application.establishedYear?.toString() || "-"}
                />
                <DetailRow
                  label="No. WhatsApp Studio"
                  value={application.studioPhone || "-"}
                />
              </>
            ) : null}
            <DetailRow
              label={
                application.partnerType === "studio"
                  ? "Tentang Studio"
                  : "Tentang Saya"
              }
              value={application.about}
            />
          </DetailCard>

          <DetailCard title="Data Verifikasi">
            <LinkRow
              label={
                application.partnerType === "studio"
                  ? "Instagram Studio"
                  : "Instagram Profesional"
              }
              href={application.instagramUrl}
            />
            <LinkRow
              label="Google Drive Portofolio"
              href={application.portfolioUrl}
            />
            <LinkRow label="CV" href={application.cvFileUrl || null} />
            {application.partnerType === "studio" ? (
              <>
                <LinkRow
                  label="Google Maps / Lokasi Studio"
                  href={application.mapsUrl}
                />
                <LinkRow label="Website Studio" href={application.websiteUrl} />
              </>
            ) : null}
          </DetailCard>

          <DetailCard title="Persetujuan Mitra dan Review">
            <DetailRow
              label="Tanggal Pengajuan"
              value={formatDateTime(application.createdAt)}
            />
            <DetailRow
              label="Persetujuan Mitra"
              value={application.termsAccepted ? "Disetujui" : "Belum tersedia"}
            />
            <DetailRow
              label="Versi Persetujuan"
              value={application.termsVersion || "-"}
            />
            <DetailRow
              label="Disetujui Pada"
              value={formatDateTime(application.termsAcceptedAt)}
            />
            <DetailRow
              label="Waktu Deklarasi"
              value={formatDateTime(application.declarationAcceptedAt)}
            />
            <DetailRow
              label="Ditinjau Oleh"
              value={application.reviewedByName || "-"}
            />
            <DetailRow
              label="Waktu Review"
              value={formatDateTime(application.reviewedAt)}
            />
            <DetailRow
              label="Alasan Penolakan"
              value={application.rejectionReason || "-"}
            />
          </DetailCard>
        </div>

        <DetailCard title="Isi Deklarasi" className="mt-6">
          {application.declarations.length > 0 ? (
            <ul className="space-y-3 text-sm leading-relaxed text-black/75">
              {application.declarations.map((item) => (
                <li key={item} className="rounded-2xl border border-black/10 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/45">Tidak ada deklarasi tersimpan.</p>
          )}
        </DetailCard>
      </div>
    </div>
  );
}

function RejectModal({
  application,
  rejectionReason,
  onReasonChange,
  onClose,
  onSubmit,
  loading,
}: {
  application: Application;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const isDisabled = loading || !rejectionReason.trim();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-[28px] bg-white p-6"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-black/40">
          Alasan Penolakan
        </p>
        <h3 className="mt-2 text-2xl text-black">{application.applicantName}</h3>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          Jelaskan alasan penolakan secara jelas. Alasan ini akan dikirim ke
          pendaftar melalui WhatsApp.
        </p>

        <textarea
          value={rejectionReason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={6}
          className="mt-5 w-full rounded-2xl border border-black/15 px-4 py-3 text-sm text-black outline-none focus:border-black"
          placeholder="Contoh: Link portofolio belum dapat diakses, mohon perbarui akses Google Drive dan ajukan kembali."
        />

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-black/15 px-4 py-3 text-sm text-black disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isDisabled}
            className="rounded-xl bg-black px-4 py-3 text-sm text-white disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Kirim Penolakan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[24px] border border-black/10 bg-white p-5 ${className}`}>
      <h3 className="text-lg text-black">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-black/40">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-black/80">{value}</p>
    </div>
  );
}

function LinkRow({
  label,
  href,
}: {
  label: string;
  href: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-black/40">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex text-sm text-blue-700 underline"
        >
          {href}
        </a>
      ) : (
        <p className="mt-1 text-sm text-black/45">-</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PartnerApplicationStatus }) {
  const styles: Record<PartnerApplicationStatus, string> = {
    pending: "bg-yellow-500/15 text-yellow-700",
    approved: "bg-green-500/15 text-green-700",
    rejected: "bg-red-500/15 text-red-700",
  };

  const labels: Record<PartnerApplicationStatus, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
