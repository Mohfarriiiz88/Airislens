import "server-only";

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { type PoolConnection, type RowDataPacket } from "mysql2/promise";

import {
  getBookingByOrderId,
  updateBookingStatusByOrderId,
} from "@/lib/bookings";
import { getDbPool } from "@/lib/db";
import { syncRefundDisputeAfterPaymentUpdate } from "@/lib/disputes";
import { getMidtransRuntimeConfig } from "@/lib/midtrans-config";
import {
  createPayment,
  createPaymentEvent,
  getPaymentByOrderId,
  type PaymentStatus,
  updatePayment,
} from "@/lib/payments";
import {
  createBookingSettlement,
  getBookingSettlementByBookingId,
  markSettlementHeldByBookingId,
  markSettlementOnHoldDisputeByBookingId,
  markSettlementRefundedByBookingId,
} from "@/lib/settlements";
import { calculatePhotographerBookingAmount } from "@/lib/service-fee";

type MidtransTransactionStatusPayload = {
  order_id?: string;
  status_code?: string;
  status_message?: string;
  gross_amount?: string;
  refund_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  settlement_time?: string;
  transaction_time?: string;
};

type ApplyMidtransStatusOptions = {
  connection?: PoolConnection;
  eventType: string;
  signatureValid?: boolean;
};

type ReconcilePendingPaymentsOptions = {
  limit?: number;
};

type OrderIdRow = RowDataPacket & {
  order_id: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown reconcile error";
}

export async function verifyMidtransSignature(
  payload: MidtransTransactionStatusPayload
) {
  const { serverKey } = await getMidtransRuntimeConfig();

  if (
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }

  const expectedSignature = createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`
    )
    .digest("hex");

  return expectedSignature === payload.signature_key;
}

export function mapMidtransStatusToBookingStatus(
  transactionStatus: string,
  fraudStatus?: string
) {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "Confirmed" : "Pending";
  }

  if (transactionStatus === "settlement") {
    return "Confirmed";
  }

  if (transactionStatus === "pending") {
    return "Pending";
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure" ||
    transactionStatus === "refund" ||
    transactionStatus === "partial_refund" ||
    transactionStatus === "chargeback" ||
    transactionStatus === "partial_chargeback"
  ) {
    return "Cancelled";
  }

  return null;
}

export function mapMidtransStatusToPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string
): PaymentStatus | null {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "paid" : "pending";
  }

  if (transactionStatus === "settlement") {
    return "paid";
  }

  if (transactionStatus === "pending") {
    return "pending";
  }

  if (transactionStatus === "deny" || transactionStatus === "failure") {
    return "failed";
  }

  if (transactionStatus === "expire") {
    return "expired";
  }

  if (transactionStatus === "cancel") {
    return "cancelled";
  }

  if (transactionStatus === "refund") {
    return "refunded";
  }

  if (transactionStatus === "partial_refund") {
    return "partial_refunded";
  }

  if (
    transactionStatus === "chargeback" ||
    transactionStatus === "partial_chargeback"
  ) {
    return "chargeback";
  }

  return null;
}

function parseGrossAmount(value: string | undefined) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : 0;
}

function parseRefundAmount(value: string | undefined) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : 0;
}

function parseMidtransTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getMidtransApiBaseUrl() {
  const { isProduction } = await getMidtransRuntimeConfig();
  return isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

async function parseMidtransApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as MidtransTransactionStatusPayload;
  }

  const rawText = await response.text().catch(() => "");
  throw new Error(
    `Midtrans API mengembalikan respons non-JSON: ${rawText || "empty response"}`
  );
}

async function fetchMidtransTransactionStatus(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const { serverKey } = await getMidtransRuntimeConfig();
  const response = await fetch(
    `${await getMidtransApiBaseUrl()}/v2/${encodeURIComponent(normalizedOrderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString(
          "base64"
        )}`,
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Midtrans status API gagal (${response.status}): ${errorBody || "unknown error"}`
    );
  }

  return (await response.json()) as MidtransTransactionStatusPayload;
}

async function postMidtransTransactionCommand(
  orderId: string,
  command: "cancel" | "expire"
) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const { serverKey } = await getMidtransRuntimeConfig();
  const response = await fetch(
    `${await getMidtransApiBaseUrl()}/v2/${encodeURIComponent(normalizedOrderId)}/${command}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString(
          "base64"
        )}`,
      },
      cache: "no-store",
    }
  );
  const payload = await parseMidtransApiResponse(response);

  if (response.status === 404) {
    return null;
  }

  const acceptedStatusCodes =
    command === "expire"
      ? new Set(["200", "201", "202", "407"])
      : new Set(["200", "201", "202"]);

  if (!response.ok || !acceptedStatusCodes.has(payload.status_code || "")) {
    throw new Error(
      payload.status_message ||
        `Midtrans ${command} API gagal (${response.status}).`
    );
  }

  return payload;
}

async function applyMidtransTransactionStatusWithConnection(
  payload: MidtransTransactionStatusPayload,
  options: ApplyMidtransStatusOptions & {
    connection: PoolConnection;
  }
) {
  const orderId = payload.order_id?.trim() || "";
  const transactionStatus =
    payload.transaction_status?.trim().toLowerCase() || "";
  const fraudStatus = payload.fraud_status?.trim().toLowerCase() || undefined;

  if (!orderId || !transactionStatus) {
    return null;
  }

  const nextBookingStatus = mapMidtransStatusToBookingStatus(
    transactionStatus,
    fraudStatus
  );
  const nextPaymentStatus = mapMidtransStatusToPaymentStatus(
    transactionStatus,
    fraudStatus
  );

  if (!nextBookingStatus || !nextPaymentStatus) {
    return null;
  }

  let payment = await getPaymentByOrderId(orderId, options.connection);
  let booking = payment
    ? null
    : await getBookingByOrderId(orderId, options.connection);

  if (!payment) {
    if (!booking) {
      throw new Error(`Booking untuk order ${orderId} tidak ditemukan.`);
    }

    payment = await createPayment(
      {
        bookingId: booking.id,
        orderId,
        grossAmount: parseGrossAmount(payload.gross_amount) || booking.amount,
        gateway: "midtrans",
        currency: "IDR",
        status: "created",
      },
      options.connection
    );
  }

  if (!payment) {
    throw new Error(`Payment record untuk order ${orderId} gagal dibuat.`);
  }

  await createPaymentEvent(
    {
      paymentId: payment.id,
      eventType: options.eventType,
      gatewayStatus: transactionStatus,
      signatureValid: options.signatureValid !== false,
      payloadJson: payload,
    },
    options.connection
  );

  const paidAt =
    nextPaymentStatus === "paid"
      ? parseMidtransTimestamp(payload.settlement_time) ??
        parseMidtransTimestamp(payload.transaction_time) ??
        (payment.paidAt ? new Date(payment.paidAt) : new Date())
      : payment.paidAt ?? undefined;
  const expiredAt =
    nextPaymentStatus === "expired"
      ? new Date()
      : payment.expiredAt ?? undefined;

  payment = await updatePayment(
    payment.id,
    {
      gatewayTransactionId: payload.transaction_id?.trim() || null,
      paymentMethod: payload.payment_type?.trim() || null,
      status: nextPaymentStatus,
      gatewayStatusRaw: transactionStatus,
      refundedAmount:
        nextPaymentStatus === "refunded" ||
        nextPaymentStatus === "partial_refunded"
          ? parseRefundAmount(payload.refund_amount) ||
            parseGrossAmount(payload.gross_amount)
          : payment.refundedAmount,
      payloadJson: payload,
      paidAt,
      expiredAt,
    },
    options.connection
  );

  if (!payment) {
    throw new Error(`Payment record untuk order ${orderId} gagal diperbarui.`);
  }

  if (!booking) {
    booking = await getBookingByOrderId(orderId, options.connection);
  }

  if (!booking) {
    throw new Error(`Booking untuk order ${orderId} tidak ditemukan.`);
  }

  const updated = await updateBookingStatusByOrderId(
    orderId,
    nextBookingStatus,
    options.connection
  );

  if (!updated) {
    throw new Error(`Status booking untuk order ${orderId} gagal diperbarui.`);
  }

  const existingSettlement = await getBookingSettlementByBookingId(
    booking.id,
    options.connection
  );

  if (!existingSettlement) {
    const photographerGrossAmount =
      booking.packagePrice !== null
        ? calculatePhotographerBookingAmount(
            booking.packagePrice,
            booking.transportFee
          )
        : Math.max(
            0,
            (booking.totalPrice ?? booking.amount) - booking.serviceFee
          );

    await createBookingSettlement(
      {
        bookingId: booking.id,
        photographerUserId: booking.photographerUserId,
        grossAmount: photographerGrossAmount,
        packagePrice:
          booking.packagePrice ??
          Math.max(0, photographerGrossAmount - booking.transportFee),
        transportFee: booking.transportFee,
        notes: "Settlement dibuat dari sinkronisasi pembayaran Midtrans.",
      },
      options.connection
    );
  }

  if (nextPaymentStatus === "paid") {
    await markSettlementHeldByBookingId(booking.id, options.connection);
  } else if (nextPaymentStatus === "refunded") {
    await markSettlementRefundedByBookingId(booking.id, false, options.connection);
    await syncRefundDisputeAfterPaymentUpdate(
      {
        bookingId: booking.id,
        paymentStatus: nextPaymentStatus,
      },
      options.connection
    );
  } else if (nextPaymentStatus === "partial_refunded") {
    await markSettlementRefundedByBookingId(booking.id, true, options.connection);
    await syncRefundDisputeAfterPaymentUpdate(
      {
        bookingId: booking.id,
        paymentStatus: nextPaymentStatus,
      },
      options.connection
    );
  } else if (nextPaymentStatus === "chargeback") {
    await markSettlementOnHoldDisputeByBookingId(booking.id, options.connection);
  }

  return {
    bookingId: booking.id,
    bookingStatus: nextBookingStatus,
    paymentId: payment.id,
    paymentStatus: nextPaymentStatus,
    orderId,
    transactionStatus,
  };
}

export async function applyMidtransTransactionStatus(
  payload: MidtransTransactionStatusPayload,
  options: ApplyMidtransStatusOptions
) {
  if (options.connection) {
    return applyMidtransTransactionStatusWithConnection(payload, {
      ...options,
      connection: options.connection,
    });
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await applyMidtransTransactionStatusWithConnection(payload, {
      ...options,
      connection,
    });
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function reconcilePaymentStatusByOrderId(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const payment = await getPaymentByOrderId(normalizedOrderId);

  if (payment && payment.status !== "created" && payment.status !== "pending") {
    return {
      orderId: normalizedOrderId,
      paymentId: payment.id,
      paymentStatus: payment.status,
      skipped: true,
    };
  }

  const payload = await fetchMidtransTransactionStatus(normalizedOrderId);

  if (!payload) {
    return null;
  }

  return applyMidtransTransactionStatus(payload, {
    eventType: "midtrans_status_api",
  });
}

export async function voidMidtransPendingPaymentByOrderId(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  try {
    const cancelPayload = await postMidtransTransactionCommand(
      normalizedOrderId,
      "cancel"
    );

    if (cancelPayload) {
      return applyMidtransTransactionStatus(cancelPayload, {
        eventType: "midtrans_cancel_api",
      });
    }
  } catch (error) {
    try {
      const expirePayload = await postMidtransTransactionCommand(
        normalizedOrderId,
        "expire"
      );

      if (expirePayload) {
        return applyMidtransTransactionStatus(expirePayload, {
          eventType: "midtrans_expire_api",
        });
      }
    } catch {
      throw error;
    }
  }

  return null;
}

async function reconcileOrderIds(orderIds: string[]) {
  const uniqueOrderIds = [
    ...new Set(orderIds.map((value) => value.trim()).filter(Boolean)),
  ];

  for (const orderId of uniqueOrderIds) {
    try {
      await reconcilePaymentStatusByOrderId(orderId);
    } catch (error) {
      console.warn("MIDTRANS RECONCILE SKIPPED:", {
        orderId,
        message: getErrorMessage(error),
      });
    }
  }
}

export async function reconcilePendingPaymentsForPartner(
  partnerUserId: number,
  options?: ReconcilePendingPaymentsOptions
) {
  const safeLimit =
    Number.isInteger(options?.limit) && Number(options?.limit) > 0
      ? Number(options?.limit)
      : 10;
  const pool = getDbPool();
  const [rows] = await pool.execute<OrderIdRow[]>(
    `
      SELECT b.order_id
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.photographer_user_id = ?
        AND (p.id IS NULL OR p.status IN ('created', 'pending'))
      ORDER BY b.id DESC
      LIMIT ${safeLimit}
    `,
    [partnerUserId]
  );

  await reconcileOrderIds(rows.map((row) => row.order_id));
}

export async function reconcilePendingPaymentsForUser(
  userId: number,
  options?: ReconcilePendingPaymentsOptions
) {
  const safeLimit =
    Number.isInteger(options?.limit) && Number(options?.limit) > 0
      ? Number(options?.limit)
      : 10;
  const pool = getDbPool();
  const [rows] = await pool.execute<OrderIdRow[]>(
    `
      SELECT b.order_id
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.customer_user_id = ?
        AND (p.id IS NULL OR p.status IN ('created', 'pending'))
      ORDER BY b.id DESC
      LIMIT ${safeLimit}
    `,
    [userId]
  );

  await reconcileOrderIds(rows.map((row) => row.order_id));
}

export async function reconcileRecentPendingPayments(
  options?: ReconcilePendingPaymentsOptions
) {
  const safeLimit =
    Number.isInteger(options?.limit) && Number(options?.limit) > 0
      ? Number(options?.limit)
      : 20;
  const pool = getDbPool();
  const [rows] = await pool.execute<OrderIdRow[]>(
    `
      SELECT b.order_id
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE p.id IS NULL OR p.status IN ('created', 'pending')
      ORDER BY b.id DESC
      LIMIT ${safeLimit}
    `
  );

  await reconcileOrderIds(rows.map((row) => row.order_id));
}
