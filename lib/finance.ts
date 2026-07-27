import "server-only";

import { type RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { ensureDisputeSchema, type DisputeStatus } from "@/lib/disputes";
import { ensurePaymentSchema } from "@/lib/payments";
import {
  ensureSettlementSchema,
  type EscrowStatus,
} from "@/lib/settlements";
import {
  ensureWithdrawalSchema,
  listWithdrawalRequestsByPartner,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from "@/lib/withdrawals";
import {
  ensurePartnerWallet,
  ensureWalletSchema,
  getPartnerWallet,
  listWalletTransactions,
  type PartnerWallet,
  type WalletTransaction,
} from "@/lib/wallets";

type PartnerSettlementRow = RowDataPacket & {
  id: number;
  booking_id: number;
  order_id: string;
  customer_name: string;
  booking_date: string;
  booking_time: string;
  booking_end_time: string | null;
  gross_amount: number;
  commission_amount: number;
  net_partner_amount: number;
  status: EscrowStatus;
  held_at: Date | string | null;
  released_at: Date | string | null;
  created_at: Date | string;
};

type SettlementSummaryRow = RowDataPacket & {
  unpaid_count: number | null;
  held_count: number | null;
  ready_count: number | null;
  released_count: number | null;
  held_amount: number | null;
  ready_amount: number | null;
  released_amount: number | null;
};

type SuperadminWithdrawalSummaryRow = RowDataPacket & {
  pending_count: number | null;
  processing_count: number | null;
  pending_amount: number | null;
  paid_amount: number | null;
};

type WalletSummaryRow = RowDataPacket & {
  total_available_balance: number | null;
  total_pending_withdrawal_balance: number | null;
};

type EscrowSummaryRow = RowDataPacket & {
  held_amount: number | null;
  ready_amount: number | null;
  platform_service_fee_revenue: number | null;
};

type WithdrawalReviewRow = RowDataPacket & {
  id: number;
  partner_user_id: number;
  requested_amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  status: WithdrawalStatus;
  requested_at: Date | string;
  reviewed_at: Date | string | null;
  paid_at: Date | string | null;
  reviewed_by_user_id: number | null;
  transfer_reference: string | null;
  admin_note: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  partner_name: string;
  partner_email: string;
};

type RefundRequestReviewRow = RowDataPacket & {
  id: number;
  booking_id: number;
  opened_by_user_id: number;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolved_by_user_id: number | null;
  created_at: Date | string;
  resolved_at: Date | string | null;
  order_id: string;
  customer_name: string;
  customer_email: string | null;
  booking_date: string;
  booking_time: string;
  booking_end_time: string | null;
  photographer_name: string;
  gross_amount: number;
};

export type PartnerSettlementItem = {
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
  status: EscrowStatus;
  heldAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type PartnerFinanceOverview = {
  wallet: PartnerWallet;
  escrow: {
    unpaidCount: number;
    heldCount: number;
    readyCount: number;
    releasedCount: number;
    heldAmount: number;
    readyAmount: number;
    releasedAmount: number;
  };
  settlements: PartnerSettlementItem[];
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
};

export type SuperadminWithdrawalReviewItem = {
  id: number;
  partnerUserId: number;
  partnerName: string;
  partnerEmail: string;
  requestedAmount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: WithdrawalStatus;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
  reviewedByUserId: number | null;
  transferReference: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SuperadminRefundRequestItem = {
  id: number;
  bookingId: number;
  orderId: string;
  openedByUserId: number;
  customerName: string;
  customerEmail: string | null;
  photographerName: string;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string | null;
  grossAmount: number;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolvedByUserId: number | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type SuperadminFinanceOverview = {
  summary: {
    pendingWithdrawalCount: number;
    processingWithdrawalCount: number;
    pendingWithdrawalAmount: number;
    paidWithdrawalAmount: number;
    totalPartnerAvailableBalance: number;
    totalPartnerPendingWithdrawalBalance: number;
    escrowHeldAmount: number;
    escrowReadyAmount: number;
    platformServiceFeeRevenue: number;
  };
  withdrawals: SuperadminWithdrawalReviewItem[];
  refundRequests: SuperadminRefundRequestItem[];
};

function normalizeTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizePartnerSettlementRow(
  row: PartnerSettlementRow
): PartnerSettlementItem {
  return {
    id: row.id,
    bookingId: row.booking_id,
    orderId: row.order_id,
    customerName: row.customer_name,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    bookingEndTime: row.booking_end_time,
    grossAmount: Number(row.gross_amount ?? 0),
    commissionAmount: Number(row.commission_amount ?? 0),
    netPartnerAmount: Number(row.net_partner_amount ?? 0),
    status: row.status,
    heldAt: normalizeTimestamp(row.held_at),
    releasedAt: normalizeTimestamp(row.released_at),
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
  };
}

function normalizeWithdrawalReviewRow(
  row: WithdrawalReviewRow
): SuperadminWithdrawalReviewItem {
  return {
    id: row.id,
    partnerUserId: row.partner_user_id,
    partnerName: row.partner_name,
    partnerEmail: row.partner_email,
    requestedAmount: Number(row.requested_amount),
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    status: row.status,
    requestedAt: normalizeTimestamp(row.requested_at) ?? new Date().toISOString(),
    reviewedAt: normalizeTimestamp(row.reviewed_at),
    paidAt: normalizeTimestamp(row.paid_at),
    reviewedByUserId: row.reviewed_by_user_id,
    transferReference: row.transfer_reference,
    adminNote: row.admin_note,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    updatedAt: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
  };
}

function normalizeRefundRequestReviewRow(
  row: RefundRequestReviewRow
): SuperadminRefundRequestItem {
  return {
    id: row.id,
    bookingId: row.booking_id,
    orderId: row.order_id,
    openedByUserId: row.opened_by_user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    photographerName: row.photographer_name,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    bookingEndTime: row.booking_end_time,
    grossAmount: Number(row.gross_amount ?? 0),
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    resolvedByUserId: row.resolved_by_user_id,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    resolvedAt: normalizeTimestamp(row.resolved_at),
  };
}

export async function listPartnerSettlements(
  partnerUserId: number,
  limit = 10
) {
  await ensureSettlementSchema();

  const pool = getDbPool();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
  const [rows] = await pool.execute<PartnerSettlementRow[]>(
    `
      SELECT
        bs.id,
        bs.booking_id,
        b.order_id,
        b.customer_name,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        b.booking_time,
        TIME_FORMAT(b.booking_end_time, '%H:%i') AS booking_end_time,
        bs.gross_amount,
        bs.commission_amount,
        bs.net_partner_amount,
        bs.status,
        bs.held_at,
        bs.released_at,
        bs.created_at
      FROM booking_settlements bs
      INNER JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.photographer_user_id = ?
      ORDER BY bs.id DESC
      LIMIT ${safeLimit}
    `,
    [partnerUserId]
  );

  return rows.map(normalizePartnerSettlementRow);
}

export async function getPartnerFinanceOverview(partnerUserId: number) {
  await Promise.all([
    ensureWalletSchema(),
    ensureSettlementSchema(),
    ensureWithdrawalSchema(),
  ]);

  await ensurePartnerWallet(partnerUserId);

  const pool = getDbPool();
  const [wallet, [summaryRows], settlements, transactions, withdrawals] =
    await Promise.all([
      getPartnerWallet(partnerUserId),
      pool.execute<SettlementSummaryRow[]>(
        `
          SELECT
            SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count,
            SUM(CASE WHEN status = 'held' THEN 1 ELSE 0 END) AS held_count,
            SUM(CASE WHEN status = 'ready_to_release' THEN 1 ELSE 0 END) AS ready_count,
            SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) AS released_count,
            SUM(CASE WHEN status = 'held' THEN net_partner_amount ELSE 0 END) AS held_amount,
            SUM(CASE WHEN status = 'ready_to_release' THEN net_partner_amount ELSE 0 END) AS ready_amount,
            SUM(CASE WHEN status = 'released' THEN net_partner_amount ELSE 0 END) AS released_amount
          FROM booking_settlements
          WHERE photographer_user_id = ?
        `,
        [partnerUserId]
      ),
      listPartnerSettlements(partnerUserId, 10),
      listWalletTransactions(partnerUserId, 10),
      listWithdrawalRequestsByPartner(partnerUserId, 10),
    ]);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  const summary = summaryRows[0];

  return {
    wallet,
    escrow: {
      unpaidCount: Number(summary?.unpaid_count ?? 0),
      heldCount: Number(summary?.held_count ?? 0),
      readyCount: Number(summary?.ready_count ?? 0),
      releasedCount: Number(summary?.released_count ?? 0),
      heldAmount: Number(summary?.held_amount ?? 0),
      readyAmount: Number(summary?.ready_amount ?? 0),
      releasedAmount: Number(summary?.released_amount ?? 0),
    },
    settlements,
    transactions,
    withdrawals,
  } satisfies PartnerFinanceOverview;
}

export async function listWithdrawalReviewItems(
  status?: WithdrawalStatus,
  limit = 50
) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const params: Array<string | number> = [];
  let whereClause = "";

  if (status) {
    whereClause = "WHERE wr.status = ?";
    params.push(status);
  }

  const [rows] = await pool.execute<WithdrawalReviewRow[]>(
    `
      SELECT
        wr.id,
        wr.partner_user_id,
        wr.requested_amount,
        wr.bank_name,
        wr.account_name,
        wr.account_number,
        wr.status,
        wr.requested_at,
        wr.reviewed_at,
        wr.paid_at,
        wr.reviewed_by_user_id,
        wr.transfer_reference,
        wr.admin_note,
        wr.created_at,
        wr.updated_at,
        u.name AS partner_name,
        u.email AS partner_email
      FROM withdrawal_requests wr
      INNER JOIN users u ON u.id = wr.partner_user_id
      ${whereClause}
      ORDER BY
        CASE wr.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'processing' THEN 2
          WHEN 'failed' THEN 3
          ELSE 4
        END,
        wr.id DESC
      LIMIT ${safeLimit}
    `,
    params
  );

  return rows.map(normalizeWithdrawalReviewRow);
}

export async function listRefundRequestReviewItems(limit = 50) {
  await ensureDisputeSchema();

  const pool = getDbPool();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const [rows] = await pool.execute<RefundRequestReviewRow[]>(
    `
      SELECT
        bd.id,
        bd.booking_id,
        bd.opened_by_user_id,
        bd.reason,
        bd.status,
        bd.resolution,
        bd.resolved_by_user_id,
        bd.created_at,
        bd.resolved_at,
        b.order_id,
        b.customer_name,
        cu.email AS customer_email,
        DATE_FORMAT(b.booking_date, '%Y-%m-%d') AS booking_date,
        b.booking_time,
        TIME_FORMAT(b.booking_end_time, '%H:%i') AS booking_end_time,
        COALESCE(NULLIF(pp.brand_name, ''), pu.name) AS photographer_name,
        COALESCE(b.total_price, b.amount) AS gross_amount
      FROM booking_disputes bd
      INNER JOIN bookings b ON b.id = bd.booking_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN users pu ON pu.id = b.photographer_user_id
      LEFT JOIN partner_profiles pp ON pp.user_id = b.photographer_user_id
      WHERE bd.type = 'refund_request'
      ORDER BY
        CASE bd.status
          WHEN 'open' THEN 0
          WHEN 'reviewing' THEN 1
          ELSE 2
        END,
        bd.id DESC
      LIMIT ${safeLimit}
    `
  );

  return rows.map(normalizeRefundRequestReviewRow);
}

export async function getSuperadminFinanceOverview(
  status?: WithdrawalStatus
) {
  await Promise.all([
    ensureWalletSchema(),
    ensureWithdrawalSchema(),
    ensureSettlementSchema(),
    ensureDisputeSchema(),
    ensurePaymentSchema(),
  ]);

  const pool = getDbPool();
  const [
    [withdrawalSummaryRows],
    [walletSummaryRows],
    [escrowSummaryRows],
    withdrawals,
    refundRequests,
  ] = await Promise.all([
    pool.execute<SuperadminWithdrawalSummaryRow[]>(
      `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
          SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN requested_amount ELSE 0 END) AS pending_amount,
          SUM(CASE WHEN status = 'paid' THEN requested_amount ELSE 0 END) AS paid_amount
        FROM withdrawal_requests
      `
    ),
    pool.execute<WalletSummaryRow[]>(
      `
        SELECT
          SUM(available_balance) AS total_available_balance,
          SUM(pending_withdrawal_balance) AS total_pending_withdrawal_balance
        FROM partner_wallets
      `
    ),
    pool.execute<EscrowSummaryRow[]>(
      `
        SELECT
          SUM(CASE WHEN status = 'held' THEN net_partner_amount ELSE 0 END) AS held_amount,
          SUM(CASE WHEN status = 'ready_to_release' THEN net_partner_amount ELSE 0 END) AS ready_amount,
          (
            SELECT COALESCE(SUM(b.service_fee), 0)
            FROM bookings b
            WHERE EXISTS (
              SELECT 1
              FROM payments pay
              WHERE pay.booking_id = b.id
                AND pay.status = 'paid'
            )
          ) AS platform_service_fee_revenue
        FROM booking_settlements
      `
    ),
    listWithdrawalReviewItems(status, 100),
    listRefundRequestReviewItems(100),
  ]);

  const withdrawalSummary = withdrawalSummaryRows[0];
  const walletSummary = walletSummaryRows[0];
  const escrowSummary = escrowSummaryRows[0];

  return {
    summary: {
      pendingWithdrawalCount: Number(withdrawalSummary?.pending_count ?? 0),
      processingWithdrawalCount: Number(withdrawalSummary?.processing_count ?? 0),
      pendingWithdrawalAmount: Number(withdrawalSummary?.pending_amount ?? 0),
      paidWithdrawalAmount: Number(withdrawalSummary?.paid_amount ?? 0),
      totalPartnerAvailableBalance: Number(
        walletSummary?.total_available_balance ?? 0
      ),
      totalPartnerPendingWithdrawalBalance: Number(
        walletSummary?.total_pending_withdrawal_balance ?? 0
      ),
      escrowHeldAmount: Number(escrowSummary?.held_amount ?? 0),
      escrowReadyAmount: Number(escrowSummary?.ready_amount ?? 0),
      platformServiceFeeRevenue: Number(
        escrowSummary?.platform_service_fee_revenue ?? 0
      ),
    },
    withdrawals,
    refundRequests,
  } satisfies SuperadminFinanceOverview;
}
