import "server-only";

import {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

import {
  getBookingByOrderId,
  getUserBookingById,
  updateBookingStatusByOrderId,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import {
  MidtransRefundError,
  requestMidtransRefundForPayment,
} from "@/lib/midtrans-refunds";
import {
  createPaymentEvent,
  getPaymentByBookingId,
  type PaymentStatus,
  updatePayment,
} from "@/lib/payments";
import {
  ensureSettlementSchema,
  markSettlementOnHoldDisputeByBookingId,
  refundBookingSettlement,
  restoreSettlementFromDisputeHoldByBookingId,
} from "@/lib/settlements";

export type DisputeType = "complaint" | "refund_request" | "partial_refund";
export type DisputeStatus =
  | "open"
  | "reviewing"
  | "resolved_refund"
  | "resolved_partial_refund"
  | "resolved_release"
  | "rejected";

type DbExecutor = Pool | PoolConnection;

type BookingDisputeRow = RowDataPacket & {
  id: number;
  booking_id: number;
  opened_by_user_id: number;
  type: DisputeType;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolved_by_user_id: number | null;
  created_at: Date | string;
  resolved_at: Date | string | null;
};

export type BookingDispute = {
  id: number;
  bookingId: number;
  openedByUserId: number;
  type: DisputeType;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolvedByUserId: number | null;
  createdAt: string;
  resolvedAt: string | null;
};

export class BookingDisputeStateError extends Error {
  constructor(message = "Status permintaan refund tidak valid untuk aksi ini.") {
    super(message);
    this.name = "BookingDisputeStateError";
  }
}

declare global {
  var __airislensDisputeSchemaReady: Promise<void> | undefined;
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

function normalizeDisputeRow(row: BookingDisputeRow): BookingDispute {
  return {
    id: row.id,
    bookingId: row.booking_id,
    openedByUserId: row.opened_by_user_id,
    type: row.type,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    resolvedByUserId: row.resolved_by_user_id,
    createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    resolvedAt: normalizeTimestamp(row.resolved_at),
  };
}

async function ensureDisputeSchemaInternal() {
  await ensureSettlementSchema();

  const pool = getDbPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS booking_disputes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_id BIGINT UNSIGNED NOT NULL,
      opened_by_user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('complaint', 'refund_request', 'partial_refund') NOT NULL,
      reason TEXT NOT NULL,
      status ENUM(
        'open',
        'reviewing',
        'resolved_refund',
        'resolved_partial_refund',
        'resolved_release',
        'rejected'
      ) NOT NULL DEFAULT 'open',
      resolution TEXT NULL,
      resolved_by_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL DEFAULT NULL,
      PRIMARY KEY (id),
      KEY booking_disputes_booking_id_idx (booking_id),
      KEY booking_disputes_opened_by_user_id_idx (opened_by_user_id),
      KEY booking_disputes_resolved_by_user_id_idx (resolved_by_user_id),
      KEY booking_disputes_status_idx (status)
    )
  `);
}

export async function ensureDisputeSchema() {
  if (!global.__airislensDisputeSchemaReady) {
    global.__airislensDisputeSchemaReady = ensureDisputeSchemaInternal().catch(
      (error) => {
        global.__airislensDisputeSchemaReady = undefined;
        throw error;
      }
    );
  }

  return global.__airislensDisputeSchemaReady;
}

export async function getBookingDisputeById(
  id: number,
  connection?: PoolConnection
) {
  await ensureDisputeSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingDisputeRow[]>(
    `
      SELECT
        id,
        booking_id,
        opened_by_user_id,
        type,
        reason,
        status,
        resolution,
        resolved_by_user_id,
        created_at,
        resolved_at
      FROM booking_disputes
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? normalizeDisputeRow(rows[0]) : null;
}

async function getLatestRefundDisputeByBookingId(
  bookingId: number,
  connection: PoolConnection
) {
  const [rows] = await connection.execute<BookingDisputeRow[]>(
    `
      SELECT
        id,
        booking_id,
        opened_by_user_id,
        type,
        reason,
        status,
        resolution,
        resolved_by_user_id,
        created_at,
        resolved_at
      FROM booking_disputes
      WHERE booking_id = ?
        AND type = 'refund_request'
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  return rows[0] ? normalizeDisputeRow(rows[0]) : null;
}

async function getBookingDisputeForUpdate(id: number, connection: PoolConnection) {
  const [rows] = await connection.execute<BookingDisputeRow[]>(
    `
      SELECT
        id,
        booking_id,
        opened_by_user_id,
        type,
        reason,
        status,
        resolution,
        resolved_by_user_id,
        created_at,
        resolved_at
      FROM booking_disputes
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [id]
  );

  return rows[0] ? normalizeDisputeRow(rows[0]) : null;
}

export async function createRefundRequest(input: {
  bookingId: number;
  openedByUserId: number;
  reason: string;
}) {
  await ensureDisputeSchema();

  const booking = await getUserBookingById(input.openedByUserId, input.bookingId);

  if (!booking) {
    throw new Error("Booking tidak ditemukan.");
  }

  if (booking.status !== "Cancelled") {
    throw new BookingDisputeStateError(
      "Booking harus dibatalkan terlebih dahulu sebelum mengajukan refund."
    );
  }

  const payment = await getPaymentByBookingId(input.bookingId);

  if (!payment || payment.status !== "paid") {
    throw new BookingDisputeStateError(
      "Refund hanya bisa diajukan untuk booking yang sudah dibayar."
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const latestRefundRequest = await getLatestRefundDisputeByBookingId(
      input.bookingId,
      connection
    );

    if (
      latestRefundRequest &&
      ["open", "reviewing", "resolved_refund"].includes(latestRefundRequest.status)
    ) {
      throw new BookingDisputeStateError(
        "Permintaan refund untuk booking ini sudah pernah diajukan."
      );
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO booking_disputes (
          booking_id,
          opened_by_user_id,
          type,
          reason
        )
        VALUES (?, ?, 'refund_request', ?)
      `,
      [input.bookingId, input.openedByUserId, input.reason.trim()]
    );

    await markSettlementOnHoldDisputeByBookingId(input.bookingId, connection);
    await connection.commit();

    return getBookingDisputeById(Number(result.insertId), connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function finalizeApprovedRefund(
  dispute: BookingDispute,
  resolvedByUserId: number,
  resolution: string | null | undefined,
  connection: PoolConnection
) {
  const payment = await getPaymentByBookingId(dispute.bookingId, connection);

  if (!payment) {
    throw new Error("Payment booking tidak ditemukan.");
  }

  await refundBookingSettlement(dispute.bookingId, resolvedByUserId, connection);

  await updatePayment(
    payment.id,
    {
      status: "refunded",
      refundedAmount: payment.grossAmount,
      gatewayStatusRaw: "manual_refund_confirmed",
    },
    connection
  );

  await createPaymentEvent(
    {
      paymentId: payment.id,
      eventType: "manual_refund_confirmed",
      gatewayStatus: "manual_refund_confirmed",
      payloadJson: {
        disputeId: dispute.id,
        bookingId: dispute.bookingId,
        resolution: resolution?.trim() || null,
      },
    },
    connection
  );

  const booking = await getBookingByOrderId(payment.orderId, connection);

  if (booking && booking.status !== "Cancelled") {
    await updateBookingStatusByOrderId(payment.orderId, "Cancelled", connection);
  }

  await connection.execute<ResultSetHeader>(
    `
      UPDATE booking_disputes
      SET
        status = 'resolved_refund',
        resolution = ?,
        resolved_by_user_id = ?,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
      LIMIT 1
    `,
    [resolution?.trim() || "Refund manual diselesaikan.", resolvedByUserId, dispute.id]
  );
}

export async function resolveRefundRequest(input: {
  disputeId: number;
  action: "approve" | "reject";
  mode?: "auto" | "manual";
  resolvedByUserId: number;
  resolution?: string | null;
}) {
  await ensureDisputeSchema();

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const dispute = await getBookingDisputeForUpdate(input.disputeId, connection);

    if (!dispute) {
      throw new Error("Permintaan refund tidak ditemukan.");
    }

    if (dispute.type !== "refund_request") {
      throw new BookingDisputeStateError("Jenis dispute ini bukan refund request.");
    }

    if (!["open", "reviewing"].includes(dispute.status)) {
      throw new BookingDisputeStateError();
    }

    if (input.action === "approve") {
      const payment = await getPaymentByBookingId(dispute.bookingId, connection);

      if (!payment) {
        throw new Error("Payment booking tidak ditemukan.");
      }

      if (payment.status === "refunded" || payment.status === "partial_refunded") {
        await syncRefundDisputeAfterPaymentUpdate(
          {
            bookingId: dispute.bookingId,
            paymentStatus: payment.status,
          },
          connection
        );
      } else if (input.mode === "manual") {
        await finalizeApprovedRefund(
          dispute,
          input.resolvedByUserId,
          input.resolution,
          connection
        );
      } else {
        const refundResponse = await requestMidtransRefundForPayment(payment, {
          amount: Math.max(0, payment.grossAmount - payment.refundedAmount),
          reason: input.resolution?.trim() || dispute.reason,
          refundKey: `refund-${dispute.id}`,
        });

        await updatePayment(
          payment.id,
          {
            gatewayStatusRaw: "refund_requested",
          },
          connection
        );

        await createPaymentEvent(
          {
            paymentId: payment.id,
            eventType: "midtrans_refund_requested",
            gatewayStatus: refundResponse.transactionStatus,
            payloadJson: {
              disputeId: dispute.id,
              bookingId: dispute.bookingId,
              approvedByUserId: input.resolvedByUserId,
              resolution: input.resolution?.trim() || null,
              refundResponse: refundResponse.raw,
            },
          },
          connection
        );

        await connection.execute<ResultSetHeader>(
          `
            UPDATE booking_disputes
            SET
              status = 'reviewing',
              resolution = ?,
              resolved_by_user_id = ?,
              resolved_at = NULL
            WHERE id = ?
            LIMIT 1
          `,
          [
            input.resolution?.trim() ||
              "Refund berhasil diajukan ke Midtrans dan menunggu konfirmasi provider.",
            input.resolvedByUserId,
            input.disputeId,
          ]
        );
      }
    } else {
      await restoreSettlementFromDisputeHoldByBookingId(
        dispute.bookingId,
        connection
      );

      await connection.execute<ResultSetHeader>(
        `
          UPDATE booking_disputes
          SET
            status = 'rejected',
            resolution = ?,
            resolved_by_user_id = ?,
            resolved_at = CURRENT_TIMESTAMP
          WHERE id = ?
          LIMIT 1
        `,
        [input.resolution?.trim() || "Permintaan refund ditolak.", input.resolvedByUserId, input.disputeId]
      );
    }

    await connection.commit();
    return getBookingDisputeById(input.disputeId, connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncRefundDisputeAfterPaymentUpdate(
  input: {
    bookingId: number;
    paymentStatus: PaymentStatus;
  },
  connection?: PoolConnection
) {
  if (!["refunded", "partial_refunded"].includes(input.paymentStatus)) {
    return null;
  }

  await ensureDisputeSchema();

  const executor = getExecutor(connection);
  const [rows] = await executor.execute<BookingDisputeRow[]>(
    `
      SELECT
        id,
        booking_id,
        opened_by_user_id,
        type,
        reason,
        status,
        resolution,
        resolved_by_user_id,
        created_at,
        resolved_at
      FROM booking_disputes
      WHERE booking_id = ?
        AND type = 'refund_request'
        AND status IN ('open', 'reviewing')
      ORDER BY id DESC
      LIMIT 1
    `,
    [input.bookingId]
  );

  const dispute = rows[0] ? normalizeDisputeRow(rows[0]) : null;

  if (!dispute) {
    return null;
  }

  const nextStatus =
    input.paymentStatus === "partial_refunded"
      ? "resolved_partial_refund"
      : "resolved_refund";
  const defaultResolution =
    input.paymentStatus === "partial_refunded"
      ? "Partial refund berhasil dikonfirmasi Midtrans."
      : "Refund berhasil dikonfirmasi Midtrans.";
  const finalResolution =
    dispute.status === "reviewing"
      ? defaultResolution
      : dispute.resolution?.trim() || defaultResolution;

  await executor.execute<ResultSetHeader>(
    `
      UPDATE booking_disputes
      SET
        status = ?,
        resolution = ?,
        resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)
      WHERE id = ?
      LIMIT 1
    `,
    [nextStatus, finalResolution, dispute.id]
  );

  return getBookingDisputeById(dispute.id, connection);
}

export { MidtransRefundError };
