import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { ensureBookingSchema } from "@/lib/bookings";
import { getDbPool } from "@/lib/db";

export type WalletTransactionType =
  | "escrow_release"
  | "withdrawal_hold"
  | "withdrawal_paid"
  | "withdrawal_rejected_return"
  | "refund_adjustment"
  | "manual_adjustment_credit"
  | "manual_adjustment_debit";

export type WalletTransactionDirection = "credit" | "debit";

type PartnerWalletRow = RowDataPacket & {
  user_id: number;
  available_balance: number;
  pending_withdrawal_balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: Date | string;
};

type WalletTransactionRow = RowDataPacket & {
  id: number;
  wallet_user_id: number;
  booking_id: number | null;
  withdrawal_request_id: number | null;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_code: string | null;
  description: string;
  created_by_user_id: number | null;
  created_at: Date | string;
};

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string;
};

type DbExecutor = Pool | PoolConnection;

export type PartnerWallet = {
  userId: number;
  availableBalance: number;
  pendingWithdrawalBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
};

export type WalletTransaction = {
  id: number;
  walletUserId: number;
  bookingId: number | null;
  withdrawalRequestId: number | null;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceCode: string | null;
  description: string;
  createdByUserId: number | null;
  createdAt: string;
};

export type LedgerEntryInput = {
  walletUserId: number;
  bookingId?: number | null;
  withdrawalRequestId?: number | null;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceCode?: string | null;
  description: string;
  createdByUserId?: number | null;
};

export class WalletBalanceError extends Error {
  constructor(message = "Saldo partner tidak mencukupi.") {
    super(message);
    this.name = "WalletBalanceError";
  }
}

declare global {
  var __airislensWalletSchemaReady: Promise<void> | undefined;
}

function getExecutor(connection?: PoolConnection) {
  return (connection ?? getDbPool()) as DbExecutor;
}

function normalizeTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeWalletRow(row: PartnerWalletRow): PartnerWallet {
  return {
    userId: row.user_id,
    availableBalance: Number(row.available_balance ?? 0),
    pendingWithdrawalBalance: Number(row.pending_withdrawal_balance ?? 0),
    totalEarned: Number(row.total_earned ?? 0),
    totalWithdrawn: Number(row.total_withdrawn ?? 0),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function normalizeWalletTransactionRow(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    walletUserId: row.wallet_user_id,
    bookingId: row.booking_id,
    withdrawalRequestId: row.withdrawal_request_id,
    type: row.type,
    direction: row.direction,
    amount: Number(row.amount),
    balanceBefore: Number(row.balance_before),
    balanceAfter: Number(row.balance_after),
    referenceCode: row.reference_code,
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdAt: normalizeTimestamp(row.created_at),
  };
}

async function ensureWalletSchemaInternal() {
  await ensureBookingSchema();

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS partner_wallets (
      user_id BIGINT UNSIGNED NOT NULL,
      available_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
      pending_withdrawal_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
      total_earned BIGINT UNSIGNED NOT NULL DEFAULT 0,
      total_withdrawn BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      wallet_user_id BIGINT UNSIGNED NOT NULL,
      booking_id BIGINT UNSIGNED NULL,
      withdrawal_request_id BIGINT UNSIGNED NULL,
      type ENUM(
        'escrow_release',
        'withdrawal_hold',
        'withdrawal_paid',
        'withdrawal_rejected_return',
        'refund_adjustment',
        'manual_adjustment_credit',
        'manual_adjustment_debit'
      ) NOT NULL,
      direction ENUM('credit', 'debit') NOT NULL,
      amount BIGINT UNSIGNED NOT NULL,
      balance_before BIGINT UNSIGNED NOT NULL,
      balance_after BIGINT UNSIGNED NOT NULL,
      reference_code VARCHAR(64) NULL,
      description TEXT NOT NULL,
      created_by_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY wallet_transactions_wallet_user_id_idx (wallet_user_id),
      KEY wallet_transactions_booking_id_idx (booking_id),
      KEY wallet_transactions_withdrawal_request_id_idx (withdrawal_request_id),
      KEY wallet_transactions_type_idx (type),
      KEY wallet_transactions_created_at_idx (created_at),
      KEY wallet_transactions_created_by_user_id_idx (created_by_user_id)
    )
  `);

  const walletColumns = [
    "available_balance",
    "pending_withdrawal_balance",
    "total_earned",
    "total_withdrawn",
  ] as const;

  for (const columnName of walletColumns) {
    const [rows] = await pool.execute<ColumnRow[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partner_wallets'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [columnName]
    );

    if (rows.length === 0) {
      throw new Error(`partner_wallets.${columnName} belum tersedia di database runtime.`);
    }
  }
}

export async function ensureWalletSchema() {
  if (!global.__airislensWalletSchemaReady) {
    global.__airislensWalletSchemaReady = ensureWalletSchemaInternal().catch(
      (error) => {
        global.__airislensWalletSchemaReady = undefined;
        throw error;
      }
    );
  }

  return global.__airislensWalletSchemaReady;
}

export async function ensurePartnerWallet(
  userId: number,
  connection?: PoolConnection
) {
  await ensureWalletSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      INSERT INTO partner_wallets (
        user_id,
        available_balance,
        pending_withdrawal_balance,
        total_earned,
        total_withdrawn
      )
      VALUES (?, 0, 0, 0, 0)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id)
    `,
    [userId]
  );

  return getPartnerWallet(userId, connection);
}

export async function getPartnerWallet(
  userId: number,
  connection?: PoolConnection
) {
  await ensureWalletSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PartnerWalletRow[]>(
    `
      SELECT
        user_id,
        available_balance,
        pending_withdrawal_balance,
        total_earned,
        total_withdrawn,
        updated_at
      FROM partner_wallets
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ? normalizeWalletRow(rows[0]) : null;
}

export async function getPartnerWalletForUpdate(
  userId: number,
  connection: PoolConnection
) {
  await ensureWalletSchema();
  await ensurePartnerWallet(userId, connection);

  const [rows] = await connection.execute<PartnerWalletRow[]>(
    `
      SELECT
        user_id,
        available_balance,
        pending_withdrawal_balance,
        total_earned,
        total_withdrawn,
        updated_at
      FROM partner_wallets
      WHERE user_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [userId]
  );

  return rows[0] ? normalizeWalletRow(rows[0]) : null;
}

export async function createWalletLedgerEntry(
  input: LedgerEntryInput,
  connection?: PoolConnection
) {
  await ensureWalletSchema();

  const executor = getExecutor(connection);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      INSERT INTO wallet_transactions (
        wallet_user_id,
        booking_id,
        withdrawal_request_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference_code,
        description,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.walletUserId,
      input.bookingId ?? null,
      input.withdrawalRequestId ?? null,
      input.type,
      input.direction,
      input.amount,
      input.balanceBefore,
      input.balanceAfter,
      input.referenceCode?.trim() || null,
      input.description.trim(),
      input.createdByUserId ?? null,
    ]
  );

  return getWalletTransactionById(Number(result.insertId), connection);
}

export async function getWalletTransactionById(
  id: number,
  connection?: PoolConnection
) {
  await ensureWalletSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<WalletTransactionRow[]>(
    `
      SELECT
        id,
        wallet_user_id,
        booking_id,
        withdrawal_request_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference_code,
        description,
        created_by_user_id,
        created_at
      FROM wallet_transactions
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeWalletTransactionRow(rows[0]) : null;
}

export async function listWalletTransactions(
  walletUserId: number,
  limit = 50,
  connection?: PoolConnection
) {
  await ensureWalletSchema();

  const executor = getExecutor(connection);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const [rows] = await executor.execute<WalletTransactionRow[]>(
    `
      SELECT
        id,
        wallet_user_id,
        booking_id,
        withdrawal_request_id,
        type,
        direction,
        amount,
        balance_before,
        balance_after,
        reference_code,
        description,
        created_by_user_id,
        created_at
      FROM wallet_transactions
      WHERE wallet_user_id = ?
      ORDER BY id DESC
      LIMIT ${safeLimit}
    `,
    [walletUserId]
  );

  return rows.map(normalizeWalletTransactionRow);
}

export async function creditPartnerWallet(input: {
  userId: number;
  amount: number;
  bookingId?: number | null;
  type: WalletTransactionType;
  description: string;
  referenceCode?: string | null;
  createdByUserId?: number | null;
  connection: PoolConnection;
}) {
  await ensureWalletSchema();

  const wallet = await getPartnerWalletForUpdate(input.userId, input.connection);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  const balanceBefore = wallet.availableBalance;
  const balanceAfter = balanceBefore + input.amount;

  await input.connection.execute<ResultSetHeader>(
    `
      UPDATE partner_wallets
      SET
        available_balance = ?,
        total_earned = total_earned + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      LIMIT 1
    `,
    [balanceAfter, input.amount, input.userId]
  );

  return createWalletLedgerEntry(
    {
      walletUserId: input.userId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      direction: "credit",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceCode: input.referenceCode ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId ?? null,
    },
    input.connection
  );
}

export async function debitPartnerWallet(input: {
  userId: number;
  amount: number;
  bookingId?: number | null;
  type: WalletTransactionType;
  description: string;
  referenceCode?: string | null;
  createdByUserId?: number | null;
  connection: PoolConnection;
}) {
  await ensureWalletSchema();

  const wallet = await getPartnerWalletForUpdate(input.userId, input.connection);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  if (wallet.availableBalance < input.amount) {
    throw new WalletBalanceError(
      "Saldo wallet partner tidak cukup untuk penyesuaian refund."
    );
  }

  const balanceBefore = wallet.availableBalance;
  const balanceAfter = balanceBefore - input.amount;

  await input.connection.execute<ResultSetHeader>(
    `
      UPDATE partner_wallets
      SET
        available_balance = ?,
        total_earned = CASE
          WHEN total_earned >= ? THEN total_earned - ?
          ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      LIMIT 1
    `,
    [balanceAfter, input.amount, input.amount, input.userId]
  );

  return createWalletLedgerEntry(
    {
      walletUserId: input.userId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      direction: "debit",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceCode: input.referenceCode ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId ?? null,
    },
    input.connection
  );
}

export async function holdPartnerWithdrawalBalance(input: {
  userId: number;
  amount: number;
  withdrawalRequestId?: number | null;
  referenceCode?: string | null;
  createdByUserId?: number | null;
  description: string;
  connection: PoolConnection;
}) {
  await ensureWalletSchema();

  const wallet = await getPartnerWalletForUpdate(input.userId, input.connection);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  if (wallet.availableBalance < input.amount) {
    throw new WalletBalanceError();
  }

  const balanceBefore = wallet.availableBalance;
  const balanceAfter = balanceBefore - input.amount;

  await input.connection.execute<ResultSetHeader>(
    `
      UPDATE partner_wallets
      SET
        available_balance = ?,
        pending_withdrawal_balance = pending_withdrawal_balance + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      LIMIT 1
    `,
    [balanceAfter, input.amount, input.userId]
  );

  return createWalletLedgerEntry(
    {
      walletUserId: input.userId,
      withdrawalRequestId: input.withdrawalRequestId ?? null,
      type: "withdrawal_hold",
      direction: "debit",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceCode: input.referenceCode ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId ?? null,
    },
    input.connection
  );
}

export async function returnHeldWithdrawalBalance(input: {
  userId: number;
  amount: number;
  withdrawalRequestId?: number | null;
  referenceCode?: string | null;
  createdByUserId?: number | null;
  description: string;
  connection: PoolConnection;
}) {
  await ensureWalletSchema();

  const wallet = await getPartnerWalletForUpdate(input.userId, input.connection);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  if (wallet.pendingWithdrawalBalance < input.amount) {
    throw new WalletBalanceError("Saldo withdrawal tertahan tidak mencukupi.");
  }

  const balanceBefore = wallet.availableBalance;
  const balanceAfter = balanceBefore + input.amount;

  await input.connection.execute<ResultSetHeader>(
    `
      UPDATE partner_wallets
      SET
        available_balance = ?,
        pending_withdrawal_balance = pending_withdrawal_balance - ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      LIMIT 1
    `,
    [balanceAfter, input.amount, input.userId]
  );

  return createWalletLedgerEntry(
    {
      walletUserId: input.userId,
      withdrawalRequestId: input.withdrawalRequestId ?? null,
      type: "withdrawal_rejected_return",
      direction: "credit",
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceCode: input.referenceCode ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId ?? null,
    },
    input.connection
  );
}

export async function finalizeWithdrawalBalance(input: {
  userId: number;
  amount: number;
  withdrawalRequestId?: number | null;
  referenceCode?: string | null;
  createdByUserId?: number | null;
  description: string;
  connection: PoolConnection;
}) {
  await ensureWalletSchema();

  const wallet = await getPartnerWalletForUpdate(input.userId, input.connection);

  if (!wallet) {
    throw new Error("Wallet partner tidak ditemukan.");
  }

  if (wallet.pendingWithdrawalBalance < input.amount) {
    throw new WalletBalanceError("Saldo withdrawal tertahan tidak mencukupi.");
  }

  await input.connection.execute<ResultSetHeader>(
    `
      UPDATE partner_wallets
      SET
        pending_withdrawal_balance = pending_withdrawal_balance - ?,
        total_withdrawn = total_withdrawn + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      LIMIT 1
    `,
    [input.amount, input.amount, input.userId]
  );

  return createWalletLedgerEntry(
    {
      walletUserId: input.userId,
      withdrawalRequestId: input.withdrawalRequestId ?? null,
      type: "withdrawal_paid",
      direction: "debit",
      amount: input.amount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: wallet.availableBalance,
      referenceCode: input.referenceCode ?? null,
      description: input.description,
      createdByUserId: input.createdByUserId ?? null,
    },
    input.connection
  );
}
