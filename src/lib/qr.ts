import QRCode from "qrcode";
import crypto from "crypto";

const QR_SECRET = process.env.JWT_SECRET || "eventtick-qr-secret";

export interface TicketQrPayload {
  ticketId: string;
  ticketCode: string;
  eventId: string;
  userId: string;
  issuedAt: number;
}

/**
 * Create a signed QR payload so scanners can verify authenticity
 */
export function createQrPayload(data: Omit<TicketQrPayload, "issuedAt">): string {
  const payload: TicketQrPayload = {
    ...data,
    issuedAt: Date.now(),
  };
  const json = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", QR_SECRET)
    .update(json)
    .digest("hex")
    .slice(0, 16);

  // Compact format: base64(json).signature
  const encoded = Buffer.from(json).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifyQrPayload(qrData: string): TicketQrPayload | null {
  try {
    const [encoded, signature] = qrData.split(".");
    if (!encoded || !signature) return null;

    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = crypto
      .createHmac("sha256", QR_SECRET)
      .update(json)
      .digest("hex")
      .slice(0, 16);

    if (signature !== expected) return null;

    return JSON.parse(json) as TicketQrPayload;
  } catch {
    return null;
  }
}

/**
 * Generate QR code as Data URL (PNG)
 */
export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

/**
 * Generate QR code as Buffer (for PDF / download)
 */
export async function generateQrBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  });
}
