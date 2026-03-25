const TEST_BIS_HOST = "test.bis.gov.lv";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function shouldUseBisRelay(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  const isTestBis = normalized.includes(TEST_BIS_HOST);
  const isVercelRuntime = Boolean(process.env.VERCEL_ENV || process.env.VERCEL);

  return isTestBis && isVercelRuntime;
}

export function getBisRelayBaseUrl() {
  const relayUrl = process.env.BIS_TEST_ENV_RELAY_URL?.trim();
  if (!relayUrl) {
    throw new Error("BIS_TEST_ENV_RELAY_URL is required when using BIS test relay mode");
  }

  return relayUrl.replace(/\/+$/, "");
}

export async function bisFetch(baseUrl: string, url: string, init?: RequestInit) {
  if (!shouldUseBisRelay(baseUrl)) {
    return fetch(url, init);
  }

  const relayUrl = new URL(`${getBisRelayBaseUrl()}/api/TestBisEnv/proxy`);
  relayUrl.searchParams.set("target", url);

  const headers = new Headers(init?.headers ?? {});
  const relaySecret = process.env.BIS_TEST_ENV_RELAY_SECRET?.trim();
  if (relaySecret) {
    headers.set("x-bis-relay-secret", relaySecret);
  }

  return fetch(relayUrl, {
    ...init,
    headers,
    cache: "no-store",
  });
}
