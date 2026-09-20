/**
 * Ticket delivery via SMS & WhatsApp
 * All providers are modularized via env vars.
 */

export async function sendTicketSms(
  phone: string,
  ticketCode: string,
  eventTitle: string,
  ticketUrl: string
) {
  const apiKey = process.env.SMS_GATEWAY_API_KEY;
  const baseUrl = process.env.SMS_GATEWAY_BASE_URL;
  const sender = process.env.SMS_GATEWAY_SENDER_ID || "EventTick";

  const message = `🎫 EventTick: Your ticket for "${eventTitle}" is ready!\nCode: ${ticketCode}\nView: ${ticketUrl}`;

  if (!apiKey || !baseUrl || apiKey === "your_sms_api_key") {
    console.log("[SMS SIM]", phone, message);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(`${baseUrl}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: phone, from: sender, message }),
    });
    return { success: res.ok };
  } catch (err) {
    console.error("SMS error:", err);
    return { success: false };
  }
}

export async function sendTicketWhatsApp(
  phone: string,
  ticketCode: string,
  eventTitle: string,
  ticketUrl: string
) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const baseUrl = process.env.WHATSAPP_BASE_URL || "https://graph.facebook.com/v18.0";

  if (!apiKey || !phoneNumberId || apiKey === "your_whatsapp_api_key") {
    console.log("[WhatsApp SIM]", phone, ticketCode, eventTitle);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "text",
        text: {
          body: `🎫 *EventTick Ticket*\n\nEvent: ${eventTitle}\nCode: *${ticketCode}*\n\nView & download your QR pass:\n${ticketUrl}`,
        },
      }),
    });
    return { success: res.ok };
  } catch (err) {
    console.error("WhatsApp error:", err);
    return { success: false };
  }
}
