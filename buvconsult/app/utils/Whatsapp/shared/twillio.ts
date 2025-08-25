import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export const SENDER_NUMBER = "whatsapp:+13135131153";

export async function sendMessage(to: string | null, message: string) {
  if (!to || !message) return;
  if (to === SENDER_NUMBER) return;
  try {
    const res = await client.messages.create({ from: SENDER_NUMBER, to, body: message });
    console.log("📤 Twilio SID:", res.sid);
  } catch (err) {
    console.error("❌ Twilio send error:", err);
  }
}
