export async function POST(req) {
  const formData = await req.formData();
  // Twilio sends x-www-form-urlencoded, so let's read all fields
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  console.log('Incoming WhatsApp:', data);

  // Respond with empty TwiML (required)
  return new Response('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' }
  });
}