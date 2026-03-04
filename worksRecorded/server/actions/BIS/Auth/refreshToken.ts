import {prisma} from "@/lib/utils/db";

const TOKEN_URL = "https://test.bis.gov.lv/services/auth/oauth2.0/token";

const CLIENT_ID =
  "1ae54efa0f06d5ec6aaa4eaec32c478b5eecd010fdd3289a399ed37b3b881f21";
const CLIENT_SECRET =
  "145a3725c6467e2e5c6676029d7e3dd700cd84a3cb3e8b3bb69ae8de5cb65d1e";

function base64(s: string) {
  return Buffer.from(s).toString("base64");
}

export async function refreshToken() {
  const latest = await prisma.bisToken.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true, refreshToken: true },
  });

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: latest.refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json();

  await prisma.bisToken.update({
    where: { id: latest.id },
    data: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
    },
  });

  return json;
}


// await prisma.bisToken.create({
//   data: {
//     accessToken: "",
//     refreshToken: "eee64921cf8043b86eb67507d840992537630e0d1be052be2e4ee9f0f64e80f4",
//   },
// });

refreshToken()