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
  return !!(