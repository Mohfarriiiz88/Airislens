import "server-only";

import { Buffer } from "node:buffer";

import { type PaymentRecord } from "@/lib/payments";
import { getMidtransRuntimeConfig } from "@/lib/midtrans-config";

type MidtransRefundApiResponse = {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  payment_type?: string;
  transaction_time?: string;
  transaction_status?: string;
  gross_amount?: string;
  refund_chargeback_id?: string | number;
  refund_amount?: string;
  refund_key?: string;
  refunds?: unknown[];
};

type RequestMidtransRefundOptions = {
  amount?: number;
  reason?: string | null;
  refundKey?: string | null;
};

export class MidtransRefundError extends Error {
  readonly statusCode: string | number | null;
  readonly requiresManualRefund: boolean;
  readonly responseBody: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: string | number | null;
      requiresManualRefund?: boolean;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "MidtransRefundError";
    this.statusCode = options?.statusCode ?? null;
    this.requiresManualRefund = options?.requiresManualRefund === true;
    this.responseBody = options?.responseBody;
  }
}

const MIDTRANS_REFUND_SUPPORTED_METHODS = new Set([
  "credit_card",
  "gopay",
  "shopeepay",
  "dana",
  "ovo",
  "qris",
  "kredivo",
  "akulaku",
]);

async function getMidtransApiBaseUrl() {
  const { isProduction } = await getMidtransRuntimeConfig();
  return isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function parseAmount(value: string | number | undefined | null) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : 0;
}

function normalizeReason(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "Refund booking atas permintaan merchant.";
  }

  return normalized.slice(0, 255);
}

function getRefundReferenceTarget(payment: PaymentRecord) {
  if (payment.paymentMethod === "qris") {
    if (!payment.gatewayTransactionId) {
      throw new MidtransRefundError(
        "Payment QRIS ini belum memiliki transaction ID Midtrans untuk proses refund otomatis."
      );
    }

    return payment.gatewayTransactionId;
  }

  return payment.orderId;
}

async function parseMidtransResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as MidtransRefundApiResponse;
  }

  const text = await response.text().catch(() => "");
  return text;
}

export async function requestMidtransRefundForPayment(
  payment: PaymentRecord,
  options?: RequestMidtransRefundOptions
) {
  if (payment.gateway !== "midtrans") {
    throw new MidtransRefundError(
      "Payment ini tidak menggunakan gateway Midtrans.",
      { requiresManualRefund: true }
    );
  }

  const paymentMethod = payment.paymentMethod?.trim().toLowerCase() || null;

  if (!paymentMethod || !MIDTRANS_REFUND_SUPPORTED_METHODS.has(paymentMethod)) {
    throw new MidtransRefundError(
      "Metode pembayaran ini tidak mendukung refund otomatis via Midtrans. Gunakan refund manual lalu tandai refund manual di dashboard.",
      { requiresManualRefund: true }
    );
  }

  if (payment.status !== "paid") {
    throw new MidtransRefundError(
      "Auto refund Midtrans hanya bisa diajukan untuk payment berstatus paid."
    );
  }

  const refundableAmount =
    options?.amount ?? Math.max(0, payment.grossAmount - payment.refundedAmount);

  if (refundableAmount <= 0) {
    throw new MidtransRefundError(
      "Nominal refund otomatis tidak valid atau sudah habis direfund."
    );
  }

  const { serverKey } = await getMidtransRuntimeConfig();
  const referenceTarget = getRefundReferenceTarget(payment);
  const payload = {
    refund_key: options?.refundKey?.trim() || `refund-${payment.id}`,
    amount: refundableAmount,
    reason: normalizeReason(options?.reason),
  };

  const response = await fetch(
    `${await getMidtransApiBaseUrl()}/v2/${encodeURIComponent(referenceTarget)}/refund`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString(
          "base64"
        )}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  const responseBody = await parseMidtransResponse(response);
  const statusCode =
    typeof responseBody === "object" && responseBody !== null
      ? (responseBody as MidtransRefundApiResponse).status_code ??
        response.status.toString()
      : response.status.toString();

  if (!response.ok) {
    throw new MidtransRefundError(
      typeof responseBody === "object" && responseBody !== null
        ? (responseBody as MidtransRefundApiResponse).status_message ||
            "Midtrans refund request gagal."
        : "Midtrans refund request gagal.",
      {
        statusCode,
        requiresManualRefund: false,
        responseBody,
      }
    );
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    (responseBody.status_code &&
      responseBody.status_code !== "200" &&
      responseBody.status_code !== "201")
  ) {
    throw new MidtransRefundError(
      typeof responseBody === "object" && responseBody !== null
        ? (responseBody as MidtransRefundApiResponse).status_message ||
            "Midtrans refund request ditolak."
        : "Midtrans refund request ditolak.",
      {
        statusCode,
        requiresManualRefund: false,
        responseBody,
      }
    );
  }

  return {
    refundKey: responseBody.refund_key || payload.refund_key,
    refundAmount:
      parseAmount(responseBody.refund_amount) || parseAmount(payload.amount),
    transactionId:
      responseBody.transaction_id?.trim() || payment.gatewayTransactionId,
    transactionStatus:
      responseBody.transaction_status?.trim().toLowerCase() || "refund_requested",
    paymentType: responseBody.payment_type?.trim() || payment.paymentMethod,
    statusCode: responseBody.status_code || response.status.toString(),
    statusMessage:
      responseBody.status_message?.trim() ||
      "Refund berhasil diajukan ke Midtrans.",
    raw: responseBody,
  };
}
