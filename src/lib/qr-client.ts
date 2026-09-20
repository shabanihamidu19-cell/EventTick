/**
 * Client-side QR generation (browser only)
 * Uses the `qrcode` package which works in browser via dynamic import
 */
export async function generateQrDataUrl(data: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
