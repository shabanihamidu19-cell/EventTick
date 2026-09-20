/**
 * Payment Gateway abstraction layer
 * Supports AzamPay / ClickPesa / Selcom style STK Push + Disbursement
 * All credentials come from environment variables.
 */

import prisma from "./prisma";
import { getCommissionPercent } from "./utils";

export interface StkPushRequest {
  amount: number;
  phone: string;
  reference: string;
  description: string;
}

export interface StkPushResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  raw?: unknown;
}

export interface DisbursementRequest {
  amount: number;
  destination: string;
  reference: string;
  description: string;
}

export interface DisbursementResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  raw?: unknown;
}

const GATEWAY_KEY = process.env.PAYMENT_GATEWAY_API_KEY;
const GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET;
const GATEWAY_BASE = process.env.PAYMENT_GATEWAY_BASE_URL;
const CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL;
const DISBURSE_PATH = process.env.PAYMENT_DISBURSEMENT_PATH || "/disburse";

function isGatewayConfigured(): boolean {
  return !!(GATEWAY_KEY && GATEWAY_SECRET && GATEWAY_BASE && GATEWAY_KEY !== "your_payment_api_key");
}

export async function initiateStkPush(req: StkPushRequest): Promise<StkPushResponse> {
  if (!isGatewayConfigured()) {
    console.log("[PAYMENT SIM] STK Push:", req);
    const fakeId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      transactionId: fakeId,
      message: "STK Push simulated successfully. Complete payment in callback simulator.",
      raw: { simulated: true, ...req },
    };
  }

  try {
    const res = await fetch(`${GATEWAY_BASE}/stk-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GATEWAY_KEY!,
        "X-API-Secret": GATEWAY_SECRET!,
      },
      body: JSON.stringify({
        amount: req.amount,
        phone: req.phone,
        reference: req.reference,
        description: req.description,
        callbackUrl: CALLBACK_URL,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || "STK Push failed", raw: data };
    }

    return {
      success: true,
      transactionId: data.transactionId || data.reference,
      message: "STK Push initiated. Please approve on your phone.",
      raw: data,
    };
  } catch (err) {
    console.error("STK Push error:", err);
    return { success: false, message: "Payment gateway unreachable" };
  }
}

export async function disburseFunds(req: DisbursementRequest): Promise<DisbursementResponse> {
  if (!isGatewayConfigured()) {
    console.log("[PAYMENT SIM] Disbursement:", req);
    return {
      success: true,
      transactionId: `PAYOUT-SIM-${Date.now()}`,
      message: "Disbursement simulated successfully",
      raw: { simulated: true, ...req },
    };
  }

  try {
    const res = await fetch(`${GATEWAY_BASE}${DISBURSE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GATEWAY_KEY!,
        "X-API-Secret": GATEWAY_SECRET!,
      },
      body: JSON.stringify({
        amount: req.amount,
        destination: req.destination,
        reference: req.reference,
        description: req.description,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || "Disbursement failed", raw: data };
    }

    return {
      success: true,
      transactionId: data.transactionId || data.reference,
      message: "Payout successful",
      raw: data,
    };
  } catch (err) {
    console.error("Disbursement error:", err);
    return { success: false, message: "Payment gateway unreachable" };
  }
}

export async function processEventPayout(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: true,
      tickets: { where: { status: "PAID" } },
    },
  });

  if (!event) throw new Error("Event not found");
  if (event.status !== "EXPIRED") throw new Error("Event is not expired");

  const existing = await prisma.payout.findFirst({
    where: { eventId, status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
  });
  if (existing) {
    return { skipped: true, payoutId: existing.id };
  }

  const totalRevenue = event.tickets.reduce((sum, t) => sum + Number(t.pricePaid), 0);
  const commissionPercent = getCommissionPercent();
  const commission = (totalRevenue * commissionPercent) / 100;
  const netAmount = totalRevenue - commission;

  if (netAmount <= 0) {
    return { skipped: true, reason: "No revenue" };
  }

  const destination =
    event.organizer.mobileMoneyNumber ||
    event.organizer.bankAccount ||
    event.organizer.phone;

  const payout = await prisma.payout.create({
    data: {
      amount: totalRevenue,
      commission,
      netAmount,
      currency: event.currency,
      status: "PROCESSING",
      destination,
      eventId: event.id,
      organizerId: event.organizerId,
    },
  });

  const result = await disburseFunds({
    amount: netAmount,
    destination,
    reference: `PAYOUT-${payout.id}`,
    description: `EventTick payout for ${event.title}`,
  });

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: result.success ? "COMPLETED" : "FAILED",
      gatewayRef: result.transactionId,
      gatewayResponse: result.raw as object,
      processedAt: new Date(),
    },
  });

  return {
    success: result.success,
    payoutId: payout.id,
    netAmount,
    commission,
  };
}
