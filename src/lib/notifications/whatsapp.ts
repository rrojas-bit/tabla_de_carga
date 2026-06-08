import twilio from "twilio";

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.log("[WhatsApp] Skipped — Twilio not configured");
    return;
  }

  // Normalize Guatemala numbers: +502XXXXXXXX
  const normalized = to.startsWith("+") ? to : `+502${to.replace(/\D/g, "")}`;

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${normalized}`,
      body,
    });
  } catch (err) {
    // Log but don't throw — notification is best-effort
    console.error("[WhatsApp] Error:", err);
  }
}
