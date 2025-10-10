// scripts/get-gmail-refresh-token.ts
import { google } from "googleapis";
import readline from "readline";

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

// For a quick copy/paste flow, you can keep a loopback URI.
// If your OAuth client type is "Desktop app", you don't configure redirect URIs in GCP.
const REDIRECT_URI = "http://localhost"; // works for desktop/loopback copy-paste

// ⬅️ IMPORTANT: use gmail.modify (or use "https://mail.google.com/" for full access)
const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

async function main() {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",  // ensures a refresh_token
    prompt: "consent",       // forces new consent to issue a new refresh_token
    scope: SCOPES,
  });

  console.log("👉 Open this link in your browser:\n", authUrl);
  console.log("\nAfter approving, you'll be redirected to a localhost URL that may fail to load;");
  console.log("copy the `code` query param from the address bar and paste it below.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("Paste the code here: ", async (code) => {
    try {
      rl.close();
      const { tokens } = await oAuth2Client.getToken(code.trim());
      console.log("\n✅ Tokens received:");
      console.log(JSON.stringify(tokens, null, 2));
      console.log("\n🔁 Your new REFRESH_TOKEN is:\n");
      console.log(tokens.refresh_token || "(none returned)");
      console.log("\nAdd it to your .env as REFRESH_TOKEN, then restart your app.");
    } catch (err: any) {
      console.error("❌ Failed to exchange code for tokens:", err?.message ?? err);
      rl.close();
    }
  });
}

main().catch((err) => console.error("Error:", err));
