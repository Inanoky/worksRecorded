import twilio from "twilio";

// Initialize the client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function sendQuickReply() {
  const to = "whatsapp:+37124885690";
  const from = "whatsapp:+13135131153";

  // Your Quick Reply template SID
  const contentSid = "HX0feb789dce27c48ec6940d638bfbbc16";

  try {
    const message = await client.messages.create({
      to,
      from,
      contentSid,

      // Only needed if template has {{1}}, {{2}}, etc
      // Remove if your template has NO variables
      contentVariables: JSON.stringify({
        "1": "Timesheet update"
      })
    });

    console.log(`✅ Quick Reply sent! SID: ${message.sid}`);
  } catch (error: any) {
    console.error("❌ Send failed:", error.message);
  }
}

sendQuickReply();
