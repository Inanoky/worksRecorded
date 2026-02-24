// Run with:
// bun run exchangeBisCode.ts
// or node (Node 18+)

const TOKEN_URL =
  "https://test.bis.gov.lv/bisp/api/auth/oauth2.0/token";

const CLIENT_ID =
  "1ae54efa0f06d5ec6aaa4eaec32c478b5eecd010fdd3289a399ed37b3b881f21";

const CLIENT_SECRET =
  "145a3725c6467e2e5c6676029d7e3dd700cd84a3cb3e8b3bb69ae8de5cb65d1e";

const AUTH_CODE =
  "75d906da1850d4938ac1b085ff4f1421d57e835e2b45af99a57ec2bcd78b4d07";

const REDIRECT_URI = "https://localhost:3000/";

// ----------

function base64(s: string) {
  return Buffer.from(s).toString("base64");
}

async function main() {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: AUTH_CODE,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const json = await res.json();
  console.log(json);
}

main();
