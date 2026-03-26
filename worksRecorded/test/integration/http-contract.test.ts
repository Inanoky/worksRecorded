const BASE_URL = (process.env.BASE_URL || "").trim();

const describeIfBaseUrl = BASE_URL ? describe : describe.skip;

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
  });
  const body = await res.text().catch(() => "");
  return { status: res.status, body };
}

describeIfBaseUrl("HTTP contract checks (live app)", () => {
  it("serves public landing routes without 5xx", async () => {
    const routes = ["/", "/en/Landing", "/en/Landing/About", "/en/Landing/Pricing"];

    for (const route of routes) {
      const res = await req(route);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500);
    }
  });

  it("rejects protected cron endpoints without secret", async () => {
    const routes = ["/api/webhook/news-digest", "/api/webhook/reminders"];

    for (const route of routes) {
      const res = await req(route);
      expect(res.status).toBe(401);
    }
  });

  it("rejects poller endpoint without bearer token", async () => {
    const res = await req("/api/webhook/gmailPoller");
    expect(res.status).toBe(401);
  });

  it("handles unsigned Stripe webhook as 400", async () => {
    const res = await req("/api/webhook/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("handles invalid contact payload as 400", async () => {
    const res = await req("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "", email: "invalid" }),
    });

    expect(res.status).toBe(400);
  });
});
