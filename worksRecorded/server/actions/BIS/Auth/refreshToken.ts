const TOKEN_URL = "https://test.bis.gov.lv/services/auth/oauth2.0/token";

const CLIENT_ID =
  "1ae54efa0f06d5ec6aaa4eaec32c478b5eecd010fdd3289a399ed37b3b881f21";
const CLIENT_SECRET =
  "145a3725c6467e2e5c6676029d7e3dd700cd84a3cb3e8b3bb69ae8de5cb65d1e";

const REFRESH_TOKEN =
  "d045411c17167303565cd3b5cdf15dcbd9325cc10e887dbfa598d31de40d867c";

function base64(s: string) {
  return Buffer.from(s).toString("base64");
}

async function main() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: REFRESH_TOKEN,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  console.log(await res.json());
}

main();