// @ts-ignore
import midtransClient from "midtrans-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // VALIDASI INPUT
    if (!body.name || !body.phone || !body.amount) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
    });

    const parameter = {
      transaction_details: {
        order_id: "AIRIS-" + Date.now(),
        gross_amount: body.amount,
      },
      customer_details: {
        first_name: body.name,
        phone: body.phone,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      token: transaction.token,
    });

  } catch (error) {
    console.error("MIDTRANS ERROR:", error);

    return NextResponse.json(
      { error: "Payment failed" },
      { status: 500 }
    );
  }
}