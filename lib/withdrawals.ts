import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import {
  ensureWalletSchema,
  finalizeWithdrawalBalance,
  holdPartnerWithdrawalBalance,
  returnHeldWithdrawalBalance,
} from "@/lib/wallets";

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed"
  | "cancelled";

type WithdrawalRequestRow = RowDataPacket & {
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
};

type DbExecutor = Pool | PoolConnection;

export type WithdrawalRequest = {
  id: number;
  partnerUserId: number;
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

export type CreateWithdrawalRequestInput = {
  partnerUserId: number;
  requestedAmount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
};

export class WithdrawalStateError extends Error {
  constructor(message = "Status withdrawal tidak valid untuk aksi ini.") {
    super(message);
    this.name = "WithdrawalStateError";
  }
}

declare global {
  var __airislensWithdrawalSchemaReady: Promise<void> | undefined;
}

function getExecutor(connection?: PoolConnection) {
  return (connection ?? getDbPool()) as DbExecutor;
}

function normalizeTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeWithdrawalRow(row: WithdrawalRequestRow): WithdrawalRequest {
  return {
    id: row.id,
    partnerUserId: row.partner_user_id,
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

async function ensureWithdrawalSchemaInternal() {
  await ensureWalletSchema();

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      partner_user_id BIGINT UNSIGNED NOT NULL,
      requested_amount BIGINT UNSIGNED NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_name VARCHAR(100) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      status ENUM('pending', 'approved', 'processing', 'paid', 'rejected', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      paid_at TIMESTAMP NULL DEFAULT NULL,
      reviewed_by_user_id BIGINT UNSIGNED NULL,
      transfer_reference VARCHAR(100) NULL,
      admin_note TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY withdrawal_requests_partner_user_id_idx (partner_user_id),
      KEY withdrawal_requests_reviewed_by_user_id_idx (reviewed_by_user_id),
      KEY withdrawal_requests_status_idx (status),
      KEY withdrawal_requests_requested_at_idx (requested_at)
    )
  `);
}

export async function ensureWithdrawalSchema() {
  if (!global.__airislensWithdrawalSchemaReady) {
    global.__airislensWithdrawalSchemaReady =
      ensureWithdrawalSchemaInternal().catch((error) => {
        global.__airislensWithdrawalSchemaReady = undefined;
        throw error;
      });
  }

  return global.__airislensWithdrawalSchemaReady;
}

export async function getWithdrawalRequestById(
  id: number,
  connection?: PoolConnection
) {
  await ensureWithdrawalSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<WithdrawalRequestRow[]>(
    `
      SELECT
        id,
        partner_user_id,
        requested_amount,
        bank_name,
        account_name,
        account_number,
        status,
        requested_at,
        reviewed_at,
        paid_at,
        reviewed_by_user_id,
        transfer_reference,
        admin_note,
        created_at,
        updated_at
      FROM withdrawal_requests
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeWithdrawalRow(rows[0]) : null;
}

export async function listWithdrawalRequestsByPartner(
  partnerUserId: number,
  limit = 50,
  connection?: PoolConnection
) {
  await ensureWithdrawalSchema();

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const executor = getExecutor(connection);
  const [rows] = await executor.execute<WithdrawalRequestRow[]>(
    `
      SELECT
        id,
        partner_user_id,
        requested_amount,
        bank_name,
        account_name,
        account_number,
        status,
        requested_at,
        reviewed_at,
        paid_at,
        reviewed_by_user_id,
        transfer_reference,
        admin_note,
        created_at,
        updated_at
      FROM withdrawal_requests
      WHERE partner_user_id = ?
      ORDER BY id DESC
      LIMIT ${safeLimit}
    `,
    [partnerUserId]
  );

  return rows.map(normalizeWithdrawalRow);
}

export async function listWithdrawalRequests(
  status?: WithdrawalStatus,
  limit = 100,
  connection?: PoolConnection
) {
  await ensureWithdrawalSchema();

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;
  const executor = getExecutor(connection);
  const params: Array<string | number> = [];
  let whereClause = "";

  if (status) {
    whereClause = "WHERE status = ?";
    params.push(status);
  }

  const [rows] = await executor.execute<WithdrawalRequestRow[]>(
    `
      SELECT
        id,
        partner_user_id,
        requested_amount,
        bank_name,
        account_name,
        account_number,
        status,
        requested_at,
        reviewed_at,
        paid_at,
        reviewed_by_user_id,
        transfer_reference,
        admin_note,
        created_at,
        updated_at
      FROM withdrawal_requests
      ${whereClause}
      ORDER BY id DESC
      LIMIT ${safeLimit}
    `,
    params
  );

  return rows.map(normalizeWithdrawalRow);
}

async function getWithdrawalRequestForUpdate(
  id: number,
  connection: PoolConnection
) {
  await ensureWithdrawalSchema();

  const [rows] = await connection.execute<WithdrawalRequestRow[]>(
    `
      SELECT
        id,
        partner_user_id,
        requested_amount,
        bank_name,
        account_name,
        account_number,
        status,
        requested_at,
        reviewed_at,
        paid_at,
        reviewed_by_user_id,
        transfer_reference,
        admin_note,
        created_at,
        updated_at
      FROM withdrawal_requests
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [id]
  );

  return rows[0] ? normalizeWithdrawalRow(rows[0]) : null;
}

export async function createWithdrawalRequest(input: CreateWithdrawalRequestInput) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO withdrawal_requests (
          partner_user_id,
          requested_amount,
          bank_name,
          account_name,
          account_number
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        input.partnerUserId,
        input.requestedAmount,
        input.bankName.trim(),
        input.accountName.trim(),
        input.accountNumber.trim(),
      ]
    );

    const withdrawalId = Number(result.insertId);

    await holdPartnerWithdrawalBalance({
      userId: input.partnerUserId,
      amount: input.requestedAmount,
      withdrawalRequestId: withdrawalId,
      referenceCode: `WD-${withdrawalId}`,
      description: `Menahan saldo untuk withdraw #${withdrawalId}`,
      connection,
    });

    await connection.commit();
    return getWithdrawalRequestById(withdrawalId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function approveWithdrawalRequest(
  withdrawalId: number,
  reviewedByUserId: number,
  adminNote?: string | null
) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const withdrawal = await getWithdrawalRequestForUpdate(withdrawalId, connection);

    if (!withdrawal) {
      throw new Error("Withdrawal request tidak ditemukan.");
    }

    if (withdrawal.status !== "pending") {
      throw new WithdrawalStateError();
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE withdrawal_requests
        SET
          status = 'approved',
          reviewed_at = CURRENT_TIMESTAMP,
          reviewed_by_user_id = ?,
          admin_note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [reviewedByUserId, adminNote?.trim() || null, withdrawalId]
    );

    await connection.commit();
    return getWithdrawalRequestById(withdrawalId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectWithdrawalRequest(
  withdrawalId: number,
  reviewedByUserId: number,
  adminNote?: string | null
) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const withdrawal = await getWithdrawalRequestForUpdate(withdrawalId, connection);

    if (!withdrawal) {
      throw new Error("Withdrawal request tidak ditemukan.");
    }

    if (!["pending", "approved", "processing", "failed"].includes(withdrawal.status)) {
      throw new WithdrawalStateError();
    }

    await returnHeldWithdrawalBalance({
      userId: withdrawal.partnerUserId,
      amount: withdrawal.requestedAmount,
      withdrawalRequestId: withdrawalId,
      referenceCode: `WD-${withdrawalId}`,
      description: `Mengembalikan saldo withdraw #${withdrawalId}`,
      createdByUserId: reviewedByUserId,
      connection,
    });

    await connection.execute<ResultSetHeader>(
      `
        UPDATE withdrawal_requests
        SET
          status = 'rejected',
          reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
          reviewed_by_user_id = ?,
          admin_note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [reviewedByUserId, adminNote?.trim() || null, withdrawalId]
    );

    await connection.commit();
    return getWithdrawalRequestById(withdrawalId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function markWithdrawalProcessing(
  withdrawalId: number,
  reviewedByUserId: number,
  adminNote?: string | null
) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const withdrawal = await getWithdrawalRequestForUpdate(withdrawalId, connection);

    if (!withdrawal) {
      throw new Error("Withdrawal request tidak ditemukan.");
    }

    if (!["approved", "pending"].includes(withdrawal.status)) {
      throw new WithdrawalStateError();
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE withdrawal_requests
        SET
          status = 'processing',
          reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
          reviewed_by_user_id = ?,
          admin_note = COALESCE(?, admin_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [reviewedByUserId, adminNote?.trim() || null, withdrawalId]
    );

    await connection.commit();
    return getWithdrawalRequestById(withdrawalId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function markWithdrawalPaid(input: {
  withdrawalId: number;
  reviewedByUserId: number;
  transferReference?: string | null;
  adminNote?: string | null;
}) {
  await ensureWithdrawalSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const withdrawal = await getWithdrawalRequestForUpdate(
      input.withdrawalId,
      connection
    );

    if (!withdrawal) {
      throw new Error("Withdrawal request tidak ditemukan.");
    }

    if (withdrawal.status === "paid") {
      await connection.commit();
      return withdrawal;
    }

    if (!["approved", "processing"].includes(withdrawal.status)) {
      throw new WithdrawalStateError();
    }

    await finalizeWithdrawalBalance({
      userId: withdrawal.partnerUserId,
      amount: withdrawal.requestedAmount,
      withdrawalRequestId: input.withdrawalId,
      referenceCode: input.transferReference?.trim() || `WD-${input.withdrawalId}`,
      description: `Withdraw #${input.withdrawalId} dibayarkan`,
      createdByUserId: input.reviewedByUserId,
      connection,
    });

    await connection.execute<ResultSetHeader>(
      `
        UPDATE withdrawal_requests
        SET
          status = 'paid',
          reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
          paid_at = CURRENT_TIMESTAMP,
          reviewed_by_user_id = ?,
          transfer_reference = ?,
          admin_note = COALESCE(?, admin_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [
        input.reviewedByUserId,
        input.transferReference?.trim() || null,
        input.adminNote?.trim() || null,
        input.withdrawalId,
      ]
    );

    await connection.commit();
    return getWithdrawalRequestById(input.withdrawalId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
