// bis-token-min.ts
// 1) Open the printed URL in browser -> login -> copy ?code=...
// 2) Put that code into CODE and run again.
// So this code used so user can authorize our application. It should producc access code or something 

const BIS_BASE_URL = "https://test.bis.gov.lv";
const CLIENT_ID = "PASTE_CLIENT_ID";
const CLIENT_SECRET = "PASTE_CLIENT_SECRET";
const REDIRECT_URI = "https://localhost:3000/";
const SCOPE = "bis_case_documents:manage logbooks:manage";

const CODE = ""; // <-- paste the ?code=... value here

const authorizeUrl =
  `${BIS_BASE_URL}/bisp/api/auth/oauth2.0/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPE)}`;

console.log("OPEN THIS URL IN BROWSER:\n");
console.log(authorizeUrl);
console.log("\n---\n");

async function main() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", CODE);
  body.set("redirect_uri", REDIRECT_URI);

  const res = await fetch(`${BIS_BASE_URL}/bisp/api/auth/oauth2.0/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });

  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log(text);
}

main();
