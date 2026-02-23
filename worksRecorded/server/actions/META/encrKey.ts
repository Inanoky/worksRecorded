import { generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "whatsapp-keys");

function main() {
  console.log("🔐 Generating RSA key pair for WhatsApp Business Encryption...");

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  const privatePath = path.join(OUTPUT_DIR, "wr_whatsapp_private.pem");
  const publicPath = path.join(OUTPUT_DIR, "wr_whatsapp_public.pem");

  fs.writeFileSync(privatePath, privateKey);
  fs.writeFileSync(publicPath, publicKey);

  console.log("✅ Keys generated:");
  console.log("Private:", privatePath);
  console.log("Public :", publicPath);

  // Useful for Vercel env vars
  const privateBase64 = Buffer.from(privateKey).toString("base64");

  console.log("\n📦 Base64 private key (for env var WA_PRIVATE_KEY_B64):\n");
  console.log(privateBase64);

  console.log("\n⚠️ IMPORTANT:");
  console.log("• Never commit private key to Git");
  console.log("• Store private key in Vercel Secrets / AWS Secrets Manager");
  console.log("• Upload PUBLIC key to Meta API");
}

main();