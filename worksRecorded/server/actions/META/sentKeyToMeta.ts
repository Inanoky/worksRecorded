import fs from "node:fs";
import path from "node:path";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const PHONE_NUMBER_ID = "+37127445304"
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Adjust if your keys live elsewhere
const PUBLIC_KEY_PATH =
  process.env.WA_PUBLIC_KEY_PATH ??
  path.join(process.cwd(), "whatsapp-keys", "wr_whatsapp_public.pem");

function must(value: string | undefined, name: string): string {
  if (!value || !value.trim()) throw new Error(`Missing env var: ${name}`);
  return value.trim();
}

async function main() {
  const phoneNumberId = must(PHONE_NUMBER_ID, "WA_PHONE_NUMBER_ID");
  const token = must(ACCESS_TOKEN, "META_ACCESS_TOKEN");

  if (!fs.existsSync(PUBLIC_KEY_PATH)) {
    throw new Error(
      `Public key file not found at: ${PUBLIC_KEY_PATH}\n` +
        `Set WA_PUBLIC_KEY_PATH or place the key at whatsapp-keys/wr_whatsapp_public.pem`
    );
  }

  const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, "utf8").trim();

  // Basic sanity check
  if (
    !publicKeyPem.includes("-----BEGIN PUBLIC KEY-----") ||
    !publicKeyPem.includes("-----END PUBLIC KEY-----")
  ) {
    throw new Error(
      "Public key does not look like PEM format. Expected BEGIN/END PUBLIC KEY lines."
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/whatsapp_business_encryption`;

  console.log("🔐 Uploading business public key to Meta...");
  console.log("• Graph:", GRAPH_VERSION);
  console.log("• Phone Number ID:", phoneNumberId);
  console.log("• Public key path:", PUBLIC_KEY_PATH);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_public_key: publicKeyPem,
    }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep as text
  }

  if (!res.ok) {
    console.error("\n❌ Meta API call failed.");
    console.error("Status:", res.status, res.statusText);
    console.error("Response:", json ?? text);

    // Common hint
    if (json?.error?.message) {
      console.error("\nTip: check that META_ACCESS_TOKEN has WhatsApp permissions,");
      console.error("and that WA_PHONE_NUMBER_ID is the Cloud API phone number id.");
    }

    process.exit(1);
  }

  console.log("\n✅ Public key uploaded successfully.");
  console.log("Response:", json ?? text);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});