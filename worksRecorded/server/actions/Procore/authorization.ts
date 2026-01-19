// server/actions/Procore/exchangeAuthCode.ts
// Run with: bun run server/actions/Procore/exchangeAuthCode.ts

import "dotenv/config";

const TOKEN_URL = "https://login-sandbox.procore.com/oauth/token";

// 🔴 HARD-CODE THESE
const AUTHORIZATION_CODE = "Vy3MQlybDDtk1Xm6OY_oksnX6KGvR_FxmFFVGDCHp2o";
const CLIENT_ID = "HVGlnvcHoKriVNHa4tJbdaVI1FUJTN48wRS_u3wFt58";
const CLIENT_SECRET = "UE1euteXQmT2P_-d9nGIsLvdBzjztfZyagDG-wgz5CM";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

async function exchangeCodeForToken() {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: AUTHORIZATION_CODE,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();

  console.log("Status:", response.status);
  console.log("Token response:", data);

  if (!response.ok) {
    throw new Error(
      `${data.error ?? "error"}: ${data.error_description ?? "unknown"}`
    );
  }

  console.log("ACCESS_TOKEN =", data.access_token);
  console.log("REFRESH_TOKEN =", data.refresh_token);
  console.log("EXPIRES_IN =", data.expires_in);
}

exchangeCodeForToken().catch((err) => {
  console.error("❌ Token exchange failed:", err.message);
  process.exit(1);
});
