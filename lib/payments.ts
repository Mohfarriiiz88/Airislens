import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import { ensureBookingSchema } from "@/lib/bookings";
import { getDbPool } from "@/lib/db";

export type PaymentStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "partial_refunded"
  | "chargeback";

type PaymentRow = RowDataPacket & {
  id: number;
  booking_id: number;
  order_id: string;
  gateway: string;
  gateway_transaction_id: string | null;
  gross_amount: number;
  currency: string;
  payment_method: string | null;
  status: PaymentStatus;
  gateway_status_raw: string | null;
  refunded_amount: number;
  payload_json: string | null;
  paid_at: Date | string | null;
  expired_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PaymentEventRow = RowDataPacket & {
  id: number;
  payment_id: number;
  event_type: string;
  gateway_status: string | null;
  signature_valid: number | boolean;
  payload_json: string;
  created_at: Date | string;
};

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string;
};

type DbExecutor = Pool | PoolConnection;

export type PaymentRecord = {
  id: number;
  bookingId: number;
  orderId: string;
  gateway: string;
  gatewayTransactionId: string | null;
  grossAmount: number;
  currency: string;
  paymentMethod: string | null;
  status: PaymentStatus;
  gatewayStatusRaw: string | null;
  refundedAmount: number;
  payloadJson: string | null;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEventRecord = {
  id: number;
  paymentId: number;
  eventType: string;
  gatewayStatus: string | null;
  signatureValid: boolean;
  payloadJson: string;
  createdAt: string;
};

export type CreatePaymentInput = {
  bookingId: number;
  orderId: string;
  grossAmount: number;
  gateway?: string;
  gatewayTransactionId?: string | null;
  currency?: string;
  paymentMethod?: string | null;
  status?: PaymentStatus;
  gatewayStatusRaw?: string | null;
  refundedAmount?: number;
  payloadJson?: unknown;
  paidAt?: string | Date | null;
  expiredAt?: string | Date | null;
};

export type UpdatePaymentInput = {
  gatewayTransactionId?: string | null;
  paymentMethod?: string | null;
  status?: PaymentStatus;
  gatewayStatusRaw?: string | null;
  refundedAmount?: number;
  payloadJson?: unknown;
  paidAt?: string | Date | null;
  expiredAt?: string | Date | null;
};

export type CreatePaymentEventInput = {
  paymentId: number;
  eventType: string;
  gatewayStatus?: string | null;
  signatureValid?: boolean;
  payloadJson: unknown;
};

declare global {
  var __airislensPaymentSchemaReady: Promise<void> | undefined;
}

const PAYMENT_STATUSES = new Set<PaymentStatus>([
  "created",
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "refunded",
  "partial_refunded",
  "chargeback",
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

function stringifyPayload(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizePaymentStatus(value: string | null | undefined): PaymentStatus {
  return PAYMENT_STATUSES.has(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "created";
}

function normalizePaymentRow(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    orderId: row.order_id,
    gateway: row.gateway,
    gatewayTransactionId: row.gateway_transaction_id,
    grossAmount: Number(row.gross_amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    status: normalizePaymentStatus(row.status),
    gatewayStatusRaw: row.gateway_status_raw,
    refundedAmount: Number(row.refunded_amount ?? 0),
    payloadJson: row.payload_json,
    paidAt: normalizeTimestamp(row.paid_at),
    expiredAt: normalizeTimestamp(row.expired_at),
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    updatedAt: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
  };
}

function normalizePaymentEventRow(row: PaymentEventRow): PaymentEventRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    eventType: row.event_type,
    gatewayStatus: row.gateway_status,
    signatureValid: Boolean(row.signature_valid),
    payloadJson: row.payload_json,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
  };
}

async function ensurePaymentSchemaInternal() {
  await ensureBookingSchema();

  const pool = getDbPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_id BIGINT UNSIGNED NOT NULL,
      order_id VARCHAR(64) NOT NULL,
      gateway VARCHAR(32) NOT NULL DEFAULT 'midtrans',
      gateway_transaction_id VARCHAR(128) NULL,
      gross_amount BIGINT UNSIGNED NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
      payment_method VARCHAR(64) NULL,
      status ENUM(
        'created',
        'pending',
        'paid',
        'failed',
        'expired',
        'cancelled',
        'refunded',
        'partial_refunded',
        'chargeback'
      ) NOT NULL DEFAULT 'created',
      gateway_status_raw VARCHAR(64) NULL,
      refunded_amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
      payload_json LONGTEXT NULL,
      paid_at TIMESTAMP NULL DEFAULT NULL,
      expired_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY payments_booking_id_unique (booking_id),
      UNIQUE KEY payments_order_id_unique (order_id),
      KEY payments_gateway_transaction_id_idx (gateway_transaction_id),
      KEY payments_status_idx (status)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payment_id BIGINT UNSIGNED NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      gateway_status VARCHAR(64) NULL,
      signature_valid TINYINT(1) NOT NULL DEFAULT 1,
      payload_json LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY payment_events_payment_id_idx (payment_id),
      KEY payment_events_event_type_idx (event_type),
      KEY payment_events_created_at_idx (created_at)
    )
  `);

  const paymentColumns = [
    "gateway_transaction_id",
    "gross_amount",
    "currency",
    "payment_method",
    "status",
    "gateway_status_raw",
    "refunded_amount",
    "payload_json",
    "paid_at",
    "expired_at",
  ] as const;

  for (const columnName of paymentColumns) {
    const [rows] = await pool.execute<ColumnRow[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'payments'
          AND COLUMN_NAME = ?
        LIMIT 1
      `,
      [columnName]
    );

    if (rows.length === 0) {
      throw new Error(`payments.${columnName} belum tersedia di database runtime.`);
    }
  }
}

export async function ensurePaymentSchema() {
  if (!global.__airislensPaymentSchemaReady) {
    global.__airislensPaymentSchemaReady = ensurePaymentSchemaInternal().catch(
      (error) => {
        global.__airislensPaymentSchemaReady = undefined;
        throw error;
      }
    );
  }

  return global.__airislensPaymentSchemaReady;
}

export async function createPayment(
  input: CreatePaymentInput,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      INSERT INTO payments (
        booking_id,
        order_id,
        gateway,
        gateway_transaction_id,
        gross_amount,
        currency,
        payment_method,
        status,
        gateway_status_raw,
        refunded_amount,
        payload_json,
        paid_at,
        expired_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.bookingId,
      input.orderId.trim(),
      input.gateway?.trim() || "midtrans",
      input.gatewayTransactionId?.trim() || null,
      input.grossAmount,
      input.currency?.trim() || "IDR",
      input.paymentMethod?.trim() || null,
      normalizePaymentStatus(input.status),
      input.gatewayStatusRaw?.trim() || null,
      input.refundedAmount ?? 0,
      stringifyPayload(input.payloadJson),
      input.paidAt ?? null,
      input.expiredAt ?? null,
    ]
  );

  return getPaymentById(Number(result.insertId), connection);
}

export async function getPaymentById(id: number, connection?: PoolConnection) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PaymentRow[]>(
    `
      SELECT
        id,
        booking_id,
        order_id,
        gateway,
        gateway_transaction_id,
        gross_amount,
        currency,
        payment_method,
        status,
        gateway_status_raw,
        refunded_amount,
        payload_json,
        paid_at,
        expired_at,
        created_at,
        updated_at
      FROM payments
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizePaymentRow(rows[0]) : null;
}

export async function getPaymentByBookingId(
  bookingId: number,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PaymentRow[]>(
    `
      SELECT
        id,
        booking_id,
        order_id,
        gateway,
        gateway_transaction_id,
        gross_amount,
        currency,
        payment_method,
        status,
        gateway_status_raw,
        refunded_amount,
        payload_json,
        paid_at,
        expired_at,
        created_at,
        updated_at
      FROM payments
      WHERE booking_id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] ? normalizePaymentRow(rows[0]) : null;
}

export async function getPaymentByOrderId(
  orderId: string,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PaymentRow[]>(
    `
      SELECT
        id,
        booking_id,
        order_id,
        gateway,
        gateway_transaction_id,
        gross_amount,
        currency,
        payment_method,
        status,
        gateway_status_raw,
        refunded_amount,
        payload_json,
        paid_at,
        expired_at,
        created_at,
        updated_at
      FROM payments
      WHERE order_id = ?
      LIMIT 1
    `,
    [orderId.trim()]
  );

  return rows[0] ? normalizePaymentRow(rows[0]) : null;
}

export async function updatePayment(
  paymentId: number,
  input: UpdatePaymentInput,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const updates: string[] = [];
  const params: Array<string | number | Date | null> = [];

  if (input.gatewayTransactionId !== undefined) {
    updates.push("gateway_transaction_id = ?");
    params.push(input.gatewayTransactionId?.trim() || null);
  }

  if (input.paymentMethod !== undefined) {
    updates.push("payment_method = ?");
    params.push(input.paymentMethod?.trim() || null);
  }

  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(normalizePaymentStatus(input.status));
  }

  if (input.gatewayStatusRaw !== undefined) {
    updates.push("gateway_status_raw = ?");
    params.push(input.gatewayStatusRaw?.trim() || null);
  }

  if (input.refundedAmount !== undefined) {
    updates.push("refunded_amount = ?");
    params.push(input.refundedAmount);
  }

  if (input.payloadJson !== undefined) {
    updates.push("payload_json = ?");
    params.push(stringifyPayload(input.payloadJson));
  }

  if (input.paidAt !== undefined) {
    updates.push("paid_at = ?");
    params.push(input.paidAt ?? null);
  }

  if (input.expiredAt !== undefined) {
    updates.push("expired_at = ?");
    params.push(input.expiredAt ?? null);
  }

  if (updates.length === 0) {
    return getPaymentById(paymentId, connection);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  await executor.execute<ResultSetHeader>(
    `
      UPDATE payments
      SET ${updates.join(", ")}
      WHERE id = ?
      LIMIT 1
    `,
    [...params, paymentId]
  );

  return getPaymentById(paymentId, connection);
}

export async function createPaymentEvent(
  input: CreatePaymentEventInput,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [result] = await executor.execute<ResultSetHeader>(
    `
      INSERT INTO payment_events (
        payment_id,
        event_type,
        gateway_status,
        signature_valid,
        payload_json
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      input.paymentId,
      input.eventType.trim(),
      input.gatewayStatus?.trim() || null,
      input.signatureValid === false ? 0 : 1,
      stringifyPayload(input.payloadJson) ?? "{}",
    ]
  );

  return getPaymentEventById(Number(result.insertId), connection);
}

export async function getPaymentEventById(
  id: number,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PaymentEventRow[]>(
    `
      SELECT
        id,
        payment_id,
        event_type,
        gateway_status,
        signature_valid,
        payload_json,
        created_at
      FROM payment_events
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizePaymentEventRow(rows[0]) : null;
}

export async function listPaymentEvents(
  paymentId: number,
  connection?: PoolConnection
) {
  await ensurePaymentSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<PaymentEventRow[]>(
    `
      SELECT
        id,
        payment_id,
        event_type,
        gateway_status,
        signature_valid,
        payload_json,
        created_at
      FROM payment_events
      WHERE payment_id = ?
      ORDER BY id DESC
    `,
    [paymentId]
  );

  return rows.map(normalizePaymentEventRow);
}
