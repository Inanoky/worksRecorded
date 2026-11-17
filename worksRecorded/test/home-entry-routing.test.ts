import { generateKeyPairSync, sign, webcrypto } from "node:crypto";

const primitives = require("next/dist/compiled/@edge-runtime/primitives/fetch");
Object.assign(globalThis, {
  Request: primitives.Request,
  Response: primitives.Response,
  Headers: primitives.Headers,
});

let mockCookieStore: {
  get: (name: string) => { name: string; value: string } | undefined;
  getAll: () => { name: string; value: string }[];
  has: (name: string) => boolean;
  delete: (name: string | { name: string }) => void;
};
jest.mock("next/headers", () => ({ cookies: async () => mockCookieStore }));
jest.mock("uncrypto", () => require("node:crypto").webcrypto);
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`Redirect:${url}`);
  },
}));
jest.mock("next-intl/middleware", () => ({
  __esModule: true,
  default: () => (req: { headers: Headers; nextUrl: { pathname: string } }) => {
    const { NextResponse } = require("next/server");
    const headers = new Headers(req.headers);
    headers.set("x-next-intl-locale", req.nextUrl.pathname.split("/")[1]);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("x-test-intl", "true");
    return response;
  },
}));
jest.mock("@/components/landing/Landing/LegacyLandingPage", () => () => null);
jest.mock("@/server/actions/BIS/service", () => ({
  exchangeBisAuthorizationCode: jest.fn(),
  upsertUserBisToken: jest.fn(),
}));

const env = {
  KINDE_SITE_URL: "https://app.example.test",
  KINDE_ISSUER_URL: "https://auth.example.test",
  KINDE_CLIENT_ID: "local-client",
  KINDE_CLIENT_SECRET: "a".repeat(48),
  KINDE_POST_LOGIN_REDIRECT_URL: "https://app.example.test/dashboard",
  KINDE_POST_LOGOUT_REDIRECT_URL: "https://app.example.test",
};
const originalEnv = Object.fromEntries(
  Object.keys(env).map((key) => [key, process.env[key]]),
);
Object.assign(process.env, env);

const { NextRequest } = require("next/server") as typeof import("next/server");
const { default: middleware } =
  require("../middleware") as typeof import("../middleware");
const { default: Home } =
  require("../app/page") as typeof import("../app/page");
const { default: LocaleHome } =
  require("../app/[locale]/page") as typeof import("../app/[locale]/page");
const { default: LandingHome } =
  require("../app/[locale]/Landing/page") as typeof import("../app/[locale]/Landing/page");
const { GET: bisCallback } =
  require("../app/api/bis/callback/route") as typeof import("../app/api/bis/callback/route");
const { exchangeBisAuthorizationCode, upsertUserBisToken } =
  require("../server/actions/BIS/service") as typeof import("../server/actions/BIS/service");

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "home-test",
  use: "sig",
  alg: "RS256",
};
const originalFetch = global.fetch;
let refreshSucceeds = true;
let refreshCalls = 0;

function token(exp: number, subject = "test-user") {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", kid: jwk.kid }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: env.KINDE_ISSUER_URL,
      sub: subject,
      exp,
      iat: Math.floor(Date.now() / 1000),
      aud: [env.KINDE_CLIENT_ID],
      ksp: { persistent: true },
    }),
  ).toString("base64url");
  const content = `${header}.${payload}`;
  return `${content}.${sign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64url")}`;
}

function sessionCookies(exp = Math.floor(Date.now() / 1000) + 3600) {
  return {
    access_token: token(exp),
    id_token: token(exp),
    refresh_token: "refresh-old",
  };
}

function request(path = "/", cookies: Record<string, string> = {}) {
  const req = new NextRequest(`https://app.example.test${path}`, {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });
  mockCookieStore = {
    get: (name) => req.cookies.get(name),
    getAll: () => req.cookies.getAll(),
    has: (name) => req.cookies.has(name),
    delete: (name) => {
      req.cookies.delete(typeof name === "string" ? name : name.name);
    },
  };
  return req;
}

async function openHome(cookies: Record<string, string>, path = "/") {
  const req = request(path, cookies);
  const response = await middleware(req);
  const forwarded = response.headers.get("x-middleware-request-cookie");
  request(
    path,
    Object.fromEntries(
      new NextRequest(req.url, {
        headers: { cookie: forwarded ?? req.headers.get("cookie") ?? "" },
      }).cookies
        .getAll()
        .map(({ name, value }) => [name, value]),
    ),
  );
  return response;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(window, "crypto", "get")
    .mockReturnValue(webcrypto as unknown as Crypto);
  refreshCalls = 0;
  refreshSucceeds = true;
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = jest.fn(async (input) => {
    const url = String(input);
    if (url === `${env.KINDE_ISSUER_URL}/.well-known/jwks.json`)
      return Response.json({ keys: [jwk] });
    if (url === `${env.KINDE_ISSUER_URL}/oauth2/token`) {
      refreshCalls++;
      return refreshSucceeds
        ? Response.json({
            ...sessionCookies(),
            refresh_token: "refresh-rotated",
            token_type: "Bearer",
            expires_in: 3600,
          })
        : Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    throw new Error(`Unexpected network request: ${url}`);
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

it("sends an anonymous visitor to landing without contacting the identity provider", async () => {
  const response = await openHome({});
  expect(response.headers.get("Cache-Control")).toContain("private, no-store");
  await expect(Home({})).rejects.toThrow("Redirect:/lv/Landing");
  expect(global.fetch).not.toHaveBeenCalled();
});

it("validates the session before sending an authenticated visitor to dashboard", async () => {
  await openHome(sessionCookies());
  await expect(Home({})).rejects.toThrow("Redirect:/dashboard");
  expect(refreshCalls).toBe(0);
});

it("refreshes expired tokens and forwards rotated cookies to the page and browser", async () => {
  const response = await openHome(
    sessionCookies(Math.floor(Date.now() / 1000) - 60),
  );
  expect(refreshCalls).toBe(1);
  expect(response.cookies.get("refresh_token")?.value).toBe("refresh-rotated");
  expect(response.cookies.get("refresh_token")?.httpOnly).toBe(true);
  await expect(Home({})).rejects.toThrow("Redirect:/dashboard");
});

it("can restore a session when only the refresh token remains", async () => {
  await openHome({ refresh_token: "refresh-old" });
  expect(refreshCalls).toBe(1);
  await expect(Home({})).rejects.toThrow("Redirect:/dashboard");
});

it("falls back to landing after a rejected refresh instead of looping through login", async () => {
  refreshSucceeds = false;
  await openHome(sessionCookies(Math.floor(Date.now() / 1000) - 60));
  await expect(Home({})).rejects.toThrow("Redirect:/lv/Landing");
});

it("rejects forged tokens and mismatched subjects", async () => {
  refreshSucceeds = false;
  await openHome({ access_token: "forged", id_token: "forged" });
  await expect(Home({})).rejects.toThrow("Redirect:/lv/Landing");
  await openHome({
    ...sessionCookies(),
    id_token: token(Math.floor(Date.now() / 1000) + 3600, "other-user"),
  });
  await expect(Home({})).rejects.toThrow("Redirect:/lv/Landing");
});

it("rejects a well-formed token whose signature was forged", async () => {
  refreshSucceeds = false;
  const [header, payload, signature] = sessionCookies().access_token.split(".");
  const forged = `${header}.${payload}.${"A".repeat(signature.length)}`;
  await openHome({ access_token: forged, id_token: forged });
  await expect(Home({})).rejects.toThrow("Redirect:/lv/Landing");
});

it.each(["lv", "en", "ru"])(
  "handles the bare /%s entry without changing explicit marketing pages",
  async (locale) => {
    await openHome({}, `/${locale}`);
    await expect(
      LocaleHome({ params: Promise.resolve({ locale }) }),
    ).rejects.toThrow(`Redirect:/${locale}/Landing`);
    await openHome(sessionCookies(), `/${locale}`);
    await expect(
      LocaleHome({ params: Promise.resolve({ locale }) }),
    ).rejects.toThrow("Redirect:/dashboard");
    const marketing = await middleware(
      request(`/${locale}/Landing/Pricing`, sessionCookies()),
    );
    expect(marketing.headers.get("x-test-intl")).toBe("true");
  },
);

it.each(["lv", "en", "ru"])(
  "redirects an authenticated visitor reloading /%s/Landing to dashboard",
  async (locale) => {
    await openHome(sessionCookies(), `/${locale}/Landing`);
    await expect(
      LandingHome({ params: Promise.resolve({ locale }) }),
    ).rejects.toThrow("Redirect:/dashboard");
  },
);

it.each(["lv", "en", "ru"])(
  "renders /%s/Landing for an anonymous visitor without a redirect loop",
  async (locale) => {
    const response = await openHome({}, `/${locale}/Landing`);
    expect(response.headers.get("Cache-Control")).toContain(
      "private, no-store",
    );
    expect(
      response.headers.get("x-middleware-request-x-next-intl-locale"),
    ).toBe(locale);
    await expect(
      LandingHome({ params: Promise.resolve({ locale }) }),
    ).resolves.toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  },
);

it.each(["lv", "en", "ru"])(
  "refreshes the session on /%s/Landing while preserving the locale",
  async (locale) => {
    const response = await openHome(
      sessionCookies(Math.floor(Date.now() / 1000) - 60),
      `/${locale}/Landing`,
    );
    expect(refreshCalls).toBe(1);
    expect(response.cookies.get("refresh_token")?.value).toBe(
      "refresh-rotated",
    );
    expect(
      response.headers.get("x-middleware-request-x-next-intl-locale"),
    ).toBe(locale);
    await expect(
      LandingHome({ params: Promise.resolve({ locale }) }),
    ).rejects.toThrow("Redirect:/dashboard");
  },
);

it("renders landing after a failed refresh on the landing URL", async () => {
  refreshSucceeds = false;
  await openHome(
    sessionCookies(Math.floor(Date.now() / 1000) - 60),
    "/lv/Landing",
  );
  await expect(
    LandingHome({ params: Promise.resolve({ locale: "lv" }) }),
  ).resolves.toBeDefined();
});

it("keeps nested marketing pages public without refreshing their session", async () => {
  const response = await middleware(
    request(
      "/en/Landing/Pricing",
      sessionCookies(Math.floor(Date.now() / 1000) - 60),
    ),
  );
  expect(response.headers.get("x-test-intl")).toBe("true");
  expect(global.fetch).not.toHaveBeenCalled();
});

it("keeps dashboard routes protected", async () => {
  const response = await middleware(request("/dashboard"));
  expect(response.status).toBe(307);
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
    "/api/auth/login",
  );
});

it("preserves all BIS callback parameters and refreshed cookies ahead of home routing", async () => {
  const req = request(
    "/?code=bis-code&state=bis-state&extra=one&extra=two",
    sessionCookies(Math.floor(Date.now() / 1000) - 60),
  );
  const response = await middleware(req);
  const location = new URL(response.headers.get("location") ?? "");
  expect(response.status).toBe(307);
  expect(location.pathname).toBe("/api/bis/callback");
  expect(location.searchParams.get("code")).toBe("bis-code");
  expect(location.searchParams.getAll("extra")).toEqual(["one", "two"]);
  expect(response.cookies.get("refresh_token")?.value).toBe("refresh-rotated");
});

it("refreshes a direct BIS callback and retains its state validation and token exchange", async () => {
  const response = await openHome(
    {
      ...sessionCookies(Math.floor(Date.now() / 1000) - 60),
      bis_oauth_state: "test-user:bis-state",
      bis_oauth_return_to: "/dashboard/settings",
    },
    "/api/bis/callback?code=bis-code&state=bis-state",
  );
  expect(response.cookies.get("refresh_token")?.value).toBe("refresh-rotated");
  jest.mocked(exchangeBisAuthorizationCode).mockResolvedValue({
    access_token: "bis-access",
    refresh_token: "bis-refresh",
  } as never);
  const result = await bisCallback(
    request(
      "/api/bis/callback?code=bis-code&state=bis-state",
      Object.fromEntries(
        mockCookieStore.getAll().map(({ name, value }) => [name, value]),
      ),
    ),
  );
  expect(jest.mocked(upsertUserBisToken)).toHaveBeenCalledWith(
    "test-user",
    "bis-access",
    "bis-refresh",
  );
  expect(
    new URL(result.headers.get("location") ?? "").searchParams.get("bis"),
  ).toBe("connected");
});

it.each(["/?error=access_denied&state=s", "/?state=s"])(
  "keeps BIS error and state-only callbacks ahead of landing at %s",
  async (path) => {
    const response = await middleware(request(path));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      "/api/bis/callback",
    );
  },
);

it("rejects a BIS callback with an invalid state before exchanging tokens", async () => {
  const result = await bisCallback(
    request("/api/bis/callback?code=bis-code&state=wrong", {
      ...sessionCookies(),
      bis_oauth_state: "test-user:expected",
    }),
  );
  expect(exchangeBisAuthorizationCode).not.toHaveBeenCalled();
  expect(
    new URL(result.headers.get("location") ?? "").searchParams.get("message"),
  ).toBe("invalid-state");
});

it("requires a session for a direct BIS callback", async () => {
  await openHome({}, "/api/bis/callback?code=bis-code&state=bis-state");
  const result = await bisCallback(
    request("/api/bis/callback?code=bis-code&state=bis-state"),
  );
  expect(exchangeBisAuthorizationCode).not.toHaveBeenCalled();
  expect(new URL(result.headers.get("location") ?? "").pathname).toBe(
    "/api/auth/login",
  );
});

it("preserves BIS authorization errors and the saved return destination", async () => {
  const result = await bisCallback(
    request("/api/bis/callback?error=access_denied&state=bis-state", {
      ...sessionCookies(),
      bis_oauth_state: "test-user:bis-state",
      bis_oauth_return_to: "/dashboard/settings",
    }),
  );
  const location = new URL(result.headers.get("location") ?? "");
  expect(location.pathname).toBe("/dashboard/settings");
  expect(location.searchParams.get("bis")).toBe("error");
  expect(location.searchParams.get("message")).toBe("access_denied");
  expect(exchangeBisAuthorizationCode).not.toHaveBeenCalled();
  expect(mockCookieStore.has("bis_oauth_state")).toBe(false);
});
