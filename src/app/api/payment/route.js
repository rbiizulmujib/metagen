// src/app/api/route.js
import midtransClient from 'midtrans-client';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json(); // Mengambil body request dengan benar

    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    const { orderId, grossAmount, itemDetails, customerDetails } = body;

    const parameters = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      customer_details: customerDetails,
    };

    const transaction = await snap.createTransaction(parameters);
    
    return NextResponse.json({ token: transaction.token });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
