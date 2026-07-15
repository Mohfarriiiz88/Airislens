import { NextResponse } from "next/server";

import {
  applyMidtransTransactionStatus,
  verifyMidtransSignature,
} from "@/lib/midtrans";

export const runtime = "nodejs";

type MidtransNotificationBody = {
  order_id?: string;
  status_code?: string;
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

export async function POST(request: Request) {
  let body: MidtransNotificationBody;

  try {
    body = (await request.json()) as MidtransNotificationBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!(await verifyMidtransSignature(body))) {
    console.error("MIDTRANS WEBHOOK ERROR: invalid signature", {
      orderId: body.order_id,
      transactionId: body.transaction_id,
    });

    return NextResponse.json({ message: "Invalid signature." }, { status: 403 });
  }

  try {
    const result = await applyMidtransTransactionStatus(body, {
      eventType: "midtrans_notification",
      signatureValid: true,
    });

    if (!result) {
      return NextResponse.json({
        message: "Notification received but no payment status mapping was applied.",
      });
    }

    return NextResponse.json({
      message: "Payment and booking status updated.",
      ...result,
    });
  } catch (error) {
    console.error("MIDTRANS WEBHOOK ERROR:", {
      orderId: body.order_id,
      transactionStatus: body.transaction_status,
      fraudStatus: body.fraud_status,
      error,
    });

    return NextResponse.json(
      { message: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
