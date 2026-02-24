import { readFileSync } from "fs";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!;
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmF7b7jNSS1wgpv0vsstR
wNelnMvkMEM6GQDa4RHu4VndMw0tWgSRdahuWKAynXYzrifasjXiiEo+8/PqLz2q
pxDkLvEUKLt4DI13+1wieXtBmmxYWdsznZ/IiEziKxvbK2bOC9VrX7WHS7rDEPX6
SNrmgiCRHkD9JIY782raWgMQJAnRopH9t7uVJaGXXHo8mMu+uKlOdMWjDdzsOadF
q9Be5/TB5JCiMEcCSULb2TS33LsT7myo0bUhgtAVFOsJ2oeiwTwS8BzoR5Us0NR9
j67Lq1A8IJx7zK2C5rbEYvMCCLwVbesWzmY9yVfPFm+2yfNH9/W8Fq0xmasKdlnH
qwIDAQAB
-----END PUBLIC KEY-----`;


await fetch(
  `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/whatsapp_business_encryption`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      business_public_key: PUBLIC_KEY,
    }),
  }
);