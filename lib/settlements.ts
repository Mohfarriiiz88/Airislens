import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { ensureBookingSchema } from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import { ensurePartnerCmsSchema } from "@/lib/partner-cms";
import { ensurePaymentSchema } from "@/lib/payments";
import {
  creditPartnerWallet,
  debitPartnerWallet,
  ensureWalletSchema,
} from "@/lib/wallets";

export type EscrowStatus =
  | "unpaid"
  | "held"
  | "ready_to_release"
  | "released"
  | "refunded"
  | "partial_refunded"
  | "on_hold_dispute";

type BookingSettlementRow = RowDataPacket & {
  id: number;
  booking_id: number;
  photographer_user_id: number;
  gross_amount: number;
  package_price: number;
  transport_fee: number;
  commission_rate: number;
  commission_amount: number;
  net_partner_amount: number;
  status: EscrowStatus;
  held_at: Date | string | null;
  ready_to_release_at: Date | string | null;
  released_at: Date | string | null;
  refunded_at: Date | string | null;
  released_wallet_transaction_id: number | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string;
};

type PartnerCommissionRow = RowDataPacket & {
  commission_rate: number | null;
};

type DbExecutor = Pool | PoolConnection;

export type BookingSettlement = {
  id: number;
  bookingId: number;
  photographerUserId: number;
  grossAmount: number;
  packagePrice: number;
  transportFee: number;
  commissionRate: number;
  commissionAmount: number;
  netPartnerAmount: number;
  status: EscrowStatus;
  heldAt: string | null;
  readyToReleaseAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  releasedWalletTransactionId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingSettlementInput = {
  bookingId: number;
  photographerUserId: number;
  grossAmount: number;
  packagePrice: number;
  transportFee: number;
  commissionRate?: number | null;
  notes?: string | null;
};

export class SettlementStateError extends Error {
  constructor(message = "Status escrow booking tidak valid untuk aksi ini.") {
    super(message);
    this.name = "SettlementStateError";
  }
}

declare global {
  var __airislensSettlementSchemaReady: Promise<void> | undefined;
}

const ESCROW_STATUSES = new Set<EscrowStatus>([
  "unpaid",
  "held",
  "ready_to_release",
  "released",
  "refunded",
  "partial_refunded",
  "on_hold_dispute",
]);

function getExecutor(connection?: PoolConnection) {
  return (connection ?? getDbPool()) as DbExecutor;
}

function normalizeTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeEscrowStatus(value: string | null | undefined): EscrowStatus {
  return ESCROW_STATUSES.has(value as EscrowStatus)
    ? (value as EscrowStatus)
    : "unpaid";
}

function normalizeSettlementRow(row: BookingSettlementRow): BookingSettlement {
  return {
    id: row.id,
    bookingId: row.booking_id,
    photographerUserId: row.photographer_user_id,
    grossAmount: Number(row.gross_amount),
    packagePrice: Number(row.package_price ?? 0),
    transportFee: Number(row.transport_fee ?? 0),
    commissionRate: Number(row.commission_rate ?? 0),
    commissionAmount: Number(row.commission_amount ?? 0),
    netPartnerAmount: Number(row.net_partner_amount ?? 0),
    status: normalizeEscrowStatus(row.status),
    heldAt: normalizeTimestamp(row.held_at),
    readyToReleaseAt: normalizeTimestamp(row.ready_to_release_at),
    releasedAt: normalizeTimestamp(row.released_at),
    refundedAt: normalizeTimestamp(row.refunded_at),
    releasedWalletTransactionId: row.released_wallet_transaction_id,
    notes: row.notes,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    updatedAt: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
  };
}

function calculateCommissionAmount(grossAmount: number, commissionRate: number) {
  return Math.round((grossAmount * commissionRate) / 100);
}

async function resolveCommissionRate(
  photographerUserId: number,
  connection?: PoolConnection
) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PartnerCommissionRow[]>(
    `
      SELECT commission_rate
      FROM partner_profiles
      WHERE user_id = ?
      LIMIT 1
    `,
    [photographerUserId]
  );

  const value = Number(rows[0]?.commission_rate ?? 10);
  return Number.isFinite(value) && value >= 0 ? value : 10;
}

async function ensureSettlementSchemaInternal() {
  await Promise.all([
    ensureBookingSchema(),
    ensurePartnerCmsSchema(),
    ensurePaymentSchema(),
    ensureWalletSchema(),
  ]);

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS booking_settlements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_id BIGINT UNSIGNED NOT NULL,
      photographer_user_id BIGINT UNSIGNED NOT NULL,
      gross_amount BIGINT UNSIGNED NOT NULL,
      package_price BIGINT UNSIGNED NOT NULL DEFAULT 0,
      transport_fee BIGINT UNSIGNED NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
      net_partner_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM(
        'unpaid',
        'held',
        'ready_to_release',
        'released',
        'refunded',
        'partial_refunded',
        'on_hold_dispute'
      ) NOT NULL DEFAULT 'unpaid',
      held_at TIMESTAMP NULL DEFAULT NULL,
      ready_to_release_at TIMESTAMP NULL DEFAULT NULL,
      released_at TIMESTAMP NULL DEFAULT NULL,
      refunded_at TIMESTAMP NULL DEFAULT NULL,
      released_wallet_transaction_id BIGINT UNSIGNED NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY booking_settlements_booking_id_unique (booking_id),
      KEY booking_settlements_photographer_user_id_idx (photographer_user_id),
      KEY booking_settlements_status_idx (status),
      KEY booking_settlements_released_wallet_tx_idx (released_wallet_transaction_id)
    )
  `);

  const requiredColumns = [
    "gross_amount",
    "package_price",
    "transport_fee",
    "commission_rate",
    "commission_amount",
    "net_partner_amount",
    "status",
    "held_at",
    "ready_to_release_at",
    "released_at",
    "refunded_at",
  ] as const;

  for (const columnName of requiredColumns) {
    const [rows] = await pool.execute<ColumnRow[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'booking_settlements'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [columnName]
    );

    if (rows.length === 0) {
      throw new Error(
        `booking_settlements.${columnName} belum tersedia di database runtime.`
      );
    }
  }
}

export async function ensureSettlementSchema() {
  if (!global.__airislensSettlementSchemaReady) {
    global.__airislensSettlementSchemaReady =
      ensureSettlementSchemaInternal().catch((error) => {
        global.__airislensSettlementSchemaReady = undefined;
        throw error;
      });
  }

  return global.__airislensSettlementSchemaReady;
}

export async function createBookingSettlement(
  input: CreateBookingSettlementInput,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  const commissionRate =
    typeof input.commissionRate === "number"
      ? input.commissionRate
      : await resolveCommissionRate(input.photographerUserId, connection);
  const commissionAmount = calculateCommissionAmount(
    input.grossAmount,
    commissionRate
  );
  const netPartnerAmount = Math.max(0, input.grossAmount - commissionAmount);

  const [result] = await executor.execute<ResultSetHeader>(
    `
      INSERT INTO booking_settlements (
        booking_id,
        photographer_user_id,
        gross_amount,
        package_price,
        transport_fee,
        commission_rate,
        commission_amount,
        net_partner_amount,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.bookingId,
      input.photographerUserId,
      input.grossAmount,
      input.packagePrice,
      input.transportFee,
      commissionRate,
      commissionAmount,
      netPartnerAmount,
      input.notes?.trim() || null,
    ]
  );

  return getBookingSettlementById(Number(result.insertId), connection);
}

export async function getBookingSettlementById(
  id: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingSettlementRow[]>(
    `
      SELECT
        id,
        booking_id,
        photographer_user_id,
        gross_amount,
        package_price,
        transport_fee,
        commission_rate,
        commission_amount,
        net_partner_amount,
        status,
        held_at,
        ready_to_release_at,
        released_at,
        refunded_at,
        released_wallet_transaction_id,
        notes,
        created_at,
        updated_at
      FROM booking_settlements
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeSettlementRow(rows[0]) : null;
}

export async function getBookingSettlementByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingSettlementRow[]>(
    `
      SELECT
        id,
        booking_id,
        photographer_user_id,
        gross_amount,
        package_price,
        transport_fee,
        commission_rate,
        commission_amount,
        net_partner_amount,
        status,
        held_at,
        ready_to_release_at,
        released_at,
        refunded_at,
        released_wallet_transaction_id,
        notes,
        created_at,
        updated_at
      FROM booking_settlements
      WHERE booking_id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] ? normalizeSettlementRow(rows[0]) : null;
}

export async function markSettlementHeldByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = 'held',
        held_at = COALESCE(held_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
        AND status = 'unpaid'
      LIMIT 1
    `,
    [bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function markSettlementReadyToReleaseByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = 'ready_to_release',
        ready_to_release_at = COALESCE(ready_to_release_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
        AND status IN ('held', 'on_hold_dispute')
      LIMIT 1
    `,
    [bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function markSettlementRefundedByBookingId(
  bookingId: number,
  partial = false,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = ?,
        refunded_at = COALESCE(refunded_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
        AND status <> 'released'
      LIMIT 1
    `,
    [partial ? "partial_refunded" : "refunded", bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function markSettlementOnHoldDisputeByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = 'on_hold_dispute',
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
        AND status IN ('held', 'ready_to_release')
      LIMIT 1
    `,
    [bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function restoreSettlementFromDisputeHoldByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  const executor = getExecutor(connection);
  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = CASE
          WHEN ready_to_release_at IS NOT NULL THEN 'ready_to_release'
          ELSE 'held'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
        AND status = 'on_hold_dispute'
      LIMIT 1
    `,
    [bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

async function getBookingSettlementForUpdate(
  bookingId: number,
  connection: PoolConnection
) {
  await ensureSettlementSchema();

  const [rows] = await connection.execute<BookingSettlementRow[]>(
    `
      SELECT
        id,
        booking_id,
        photographer_user_id,
        gross_amount,
        package_price,
        transport_fee,
        commission_rate,
        commission_amount,
        net_partner_amount,
        status,
        held_at,
        ready_to_release_at,
        released_at,
        refunded_at,
        released_wallet_transaction_id,
        notes,
        created_at,
        updated_at
      FROM booking_settlements
      WHERE booking_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  return rows[0] ? normalizeSettlementRow(rows[0]) : null;
}

async function releaseEscrowForBookingWithConnection(
  bookingId: number,
  createdByUserId: number | null | undefined,
  connection: PoolConnection
) {
  const settlement = await getBookingSettlementForUpdate(bookingId, connection);

  if (!settlement) {
    throw new Error("Settlement booking tidak ditemukan.");
  }

  if (settlement.status === "released") {
    return settlement;
  }

  if (!["held", "ready_to_release"].includes(settlement.status)) {
    throw new SettlementStateError();
  }

  const commissionAmount =
    settlement.commissionAmount > 0
      ? settlement.commissionAmount
      : calculateCommissionAmount(
          settlement.grossAmount,
          settlement.commissionRate
        );
  const netPartnerAmount = Math.max(0, settlement.grossAmount - commissionAmount);

  const ledger = await creditPartnerWallet({
    userId: settlement.photographerUserId,
    amount: netPartnerAmount,
    bookingId,
    type: "escrow_release",
    description: `Release escrow booking #${bookingId}`,
    referenceCode: `ESCROW-${bookingId}`,
    createdByUserId: createdByUserId ?? null,
    connection,
  });

  await connection.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        commission_amount = ?,
        net_partner_amount = ?,
        status = 'released',
        released_at = COALESCE(released_at, CURRENT_TIMESTAMP),
        released_wallet_transaction_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
      LIMIT 1
    `,
    [commissionAmount, netPartnerAmount, ledger?.id ?? null, bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function releaseEscrowForBooking(
  bookingId: number,
  createdByUserId?: number | null,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  if (connection) {
    return releaseEscrowForBookingWithConnection(
      bookingId,
      createdByUserId,
      connection
    );
  }

  const pool = getDbPool();
  const managedConnection = await pool.getConnection();

  try {
    await managedConnection.beginTransaction();
    const settlement = await releaseEscrowForBookingWithConnection(
      bookingId,
      createdByUserId,
      managedConnection
    );
    await managedConnection.commit();
    return settlement;
  } catch (error) {
    await managedConnection.rollback();
    throw error;
  } finally {
    managedConnection.release();
  }
}

async function refundBookingSettlementWithConnection(
  bookingId: number,
  createdByUserId: number | null | undefined,
  connection: PoolConnection
) {
  const settlement = await getBookingSettlementForUpdate(bookingId, connection);

  if (!settlement) {
    throw new Error("Settlement booking tidak ditemukan.");
  }

  if (["refunded", "partial_refunded"].includes(settlement.status)) {
    return settlement;
  }

  if (settlement.status === "released") {
    await debitPartnerWallet({
      userId: settlement.photographerUserId,
      amount: settlement.netPartnerAmount,
      bookingId,
      type: "refund_adjustment",
      description: `Penyesuaian refund booking #${bookingId}`,
      referenceCode: `REFUND-${bookingId}`,
      createdByUserId: createdByUserId ?? null,
      connection,
    });
  } else if (!["unpaid", "held", "ready_to_release", "on_hold_dispute"].includes(settlement.status)) {
    throw new SettlementStateError(
      "Status escrow booking tidak valid untuk proses refund."
    );
  }

  await connection.execute<ResultSetHeader>(
    `
      UPDATE booking_settlements
      SET
        status = 'refunded',
        refunded_at = COALESCE(refunded_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return getBookingSettlementByBookingId(bookingId, connection);
}

export async function refundBookingSettlement(
  bookingId: number,
  createdByUserId?: number | null,
  connection?: PoolConnection
) {
  await ensureSettlementSchema();

  if (connection) {
    return refundBookingSettlementWithConnection(
      bookingId,
      createdByUserId,
      connection
    );
  }

  const pool = getDbPool();
  const managedConnection = await pool.getConnection();

  try {
    await managedConnection.beginTransaction();
    const settlement = await refundBookingSettlementWithConnection(
      bookingId,
      createdByUserId,
      managedConnection
    );
    await managedConnection.commit();
    return settlement;
  } catch (error) {
    await managedConnection.rollback();
    throw error;
  } finally {
    managedConnection.release();
  }
}
