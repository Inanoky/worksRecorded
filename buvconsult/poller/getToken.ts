import { google } from "googleapis";
import readline from "readline";

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3000"; // works fine for desktop

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function main() {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("👉 Open this link in your browser:\n", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\nPaste the code here: ", async (code) => {
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("\n✅ Your new refresh token is:\n");
    console.log(tokens.refresh_token);
  });
}

main().catch((err) => console.error("Error:", err));
