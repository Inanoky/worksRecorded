#!/usr/bin/env tsx
/**
 * Non-invasive application smoke checks.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 bun run test/app-smoke-tests.ts
 *
 * Optional env:
 *   ROUTE_SITE_ID=<dynamic placeholder for [siteId], default=smoke-site>
 *   ROUTE_LOCALE=<dynamic placeholder for [locale], default=en>
 *   ROUTE_ID=<dynamic placeholder for generic [id], default=smoke-id>
 *   ROUTE_KIND_AUTH=<placeholder for [...kindeAuth], default=login>
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type CheckResult = {
  name: string;
  method: string;
  path: string;
  status: number;
  ok: boolean;
  durationMs: number;
  note: string;
};

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const APP_DIR = path.join(process.cwd(), "app");
const API_DIR = path.join(APP_DIR, "api");

const DYNAMIC_REPLACEMENTS: Record<string, string> = {
  locale: process.env.ROUTE_LOCALE || "en",
  siteId: process.env.ROUTE_SITE_ID || "smoke-site",
  id: process.env.ROUTE_ID || "smoke-id",
  kindeAuth: process.env.ROUTE_KIND_AUTH || "login",
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

function toWebPath(relativeFile: string, fileName: string): string {
  let route = relativeFile
    .replace(new RegExp(`${fileName.replace(".", "\\.")}$`), "")
    .replace(/\\/g, "/");

  route = route
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .join("/");

  route = route.replace(/\[\.\.\.[^\]]+\]/g, (segment) => {
    const key = segment.slice(4, -1);
    return DYNAMIC_REPLACEMENTS[key] || "smoke";
  });

  route = route.replace(/\[([^\]]+)\]/g, (_full, key: string) => {
    return DYNAMIC_REPLACEMENTS[key] || `smoke-${key.toLowerCase()}`;
  });

  return `/${route}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function parseRouteMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  const fnMatches = source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g);
  for (const match of fnMatches) methods.add(match[1] as HttpMethod);

  const objectMatch = source.match(/export\s+const\s*\{([^}]+)\}\s*=\s*createRouteHandler/);
  if (objectMatch) {
    objectMatch[1]
      .split(",")
      .map((x) => x.trim())
      .forEach((m) => {
        if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) {
          methods.add(m as HttpMethod);
        }
      });
  }

  if (methods.size === 0) methods.add("GET");
  return [...methods];
}

function shouldPass(name: string, status: number): { ok: boolean; note: string } {
  const expect = (ok: boolean, note: string) => ({ ok, note });

  if (name.includes("/api/webhook/news-digest") || name.includes("/api/webhook/reminders")) {
    return expect(status === 401, "expected 401 without cron secret");
  }

  if (name.includes("/api/webhook/gmailPoller")) {
    return expect(status === 401, "expected 401 without Authorization bearer token");
  }

  if (name.includes("/api/webhook/filesDownload")) {
    return expect(status === 400, "expected 400 with missing query params");
  }

  if (name.includes("/api/TestBisEnv/proxy")) {
    return expect(status === 400 || status === 403, "expected 400/403 without target or secret");
  }

  if (name.includes("/api/webhook/stripe") && name.startsWith("POST")) {
    return expect(status === 400, "expected 400 for unsigned Stripe webhook payload");
  }

  if (name.includes("/api/send") && name.startsWith("POST")) {
    return expect(status === 400, "expected 400 for invalid contact payload");
  }

  if (name.startsWith("GET /dashboard")) {
    return expect([200, 302, 303, 307, 308, 401, 403].includes(status), "dashboard can render or redirect unauthenticated users");
  }

  if (name.includes("/api/")) {
    return expect(status >= 200 && status < 500, "API should not crash (no 5xx)");
  }

  return expect(status >= 200 && status < 500, "page should load or redirect without 5xx");
}

async function callEndpoint(method: HttpMethod, routePath: string): Promise<CheckResult> {
  const started = Date.now();
  const endpoint = `${BASE_URL}${routePath}`;

  const init: RequestInit = { method, redirect: "manual" };

  if (method === "POST") {
    if (routePath === "/api/webhook/whatsapp") {
      const body = new URLSearchParams({
        SmsStatus: "delivered",
        From: "whatsapp:+10000000000",
        WaId: "10000000000",
        Body: "smoke",
        NumMedia: "0",
        MessageSid: `SMOKE_${Date.now()}`,
      });
      init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
      init.body = body.toString();
    } else if (routePath === "/api/webhook/meta/webhook") {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    } else if (routePath === "/api/send") {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ firstName: "", email: "invalid" });
    } else {
      init.headers = { "Content-Type": "application/json" };
      init.body = "{}";
    }
  }

  let status = 0;
  try {
    const response = await fetch(endpoint, init);
    status = response.status;
    await response.text().catch(() => "");
  } catch {
    return {
      name: `${method} ${routePath}`,
      method,
      path: routePath,
      status: 0,
      ok: false,
      durationMs: Date.now() - started,
      note: "request failed (is app running at BASE_URL?)",
    };
  }

  const check = shouldPass(`${method} ${routePath}`, status);
  return {
    name: `${method} ${routePath}`,
    method,
    path: routePath,
    status,
    ok: check.ok,
    durationMs: Date.now() - started,
    note: check.note,
  };
}

async function discoverPageRoutes(): Promise<string[]> {
  const all = await walk(APP_DIR);
  const pageFiles = all.filter((f) => f.endsWith("/page.tsx") || f.endsWith("/page.ts"));

  const routes = new Set<string>();
  for (const file of pageFiles) {
    const rel = path.relative(APP_DIR, file);
    if (rel.startsWith(`api${path.sep}`)) continue;
    routes.add(toWebPath(rel, path.basename(file)));
  }

  return [...routes].sort();
}

async function discoverApiChecks(): Promise<Array<{ routePath: string; method: HttpMethod }>> {
  const all = await walk(API_DIR);
  const routeFiles = all.filter((f) => f.endsWith("/route.ts") || f.endsWith("/route.tsx"));
  const checks: Array<{ routePath: string; method: HttpMethod }> = [];

  for (const file of routeFiles) {
    const rel = path.relative(API_DIR, file);
    const routePath = `/api${toWebPath(rel, path.basename(file)) === "/" ? "" : toWebPath(rel, path.basename(file))}`;

    const isEmpty = (await stat(file)).size === 0;
    if (isEmpty) continue;

    const source = await readFile(file, "utf8");

    const methods = parseRouteMethods(source);

    for (const method of methods) {
      if (method === "PUT" || method === "PATCH" || method === "DELETE") continue;
      checks.push({ routePath, method });
    }
  }

  return checks.sort((a, b) => `${a.method} ${a.routePath}`.localeCompare(`${b.method} ${b.routePath}`));
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      [
        "Usage: BASE_URL=http://localhost:3000 bun run test/app-smoke-tests.ts",
        "",
        "This script auto-discovers App Router pages and API routes, then runs",
        "non-invasive smoke checks (GET and safe POST payloads) to verify endpoints",
        "respond without 5xx errors.",
      ].join("\n"),
    );
    return;
  }

  console.log(`Running non-invasive smoke checks against ${BASE_URL}`);

  const pageRoutes = await discoverPageRoutes();
  const apiChecks = await discoverApiChecks();

  console.log(`Discovered ${pageRoutes.length} pages and ${apiChecks.length} API checks.`);

  const results: CheckResult[] = [];

  for (const routePath of pageRoutes) {
    results.push(await callEndpoint("GET", routePath));
  }

  for (const api of apiChecks) {
    results.push(await callEndpoint(api.method, api.routePath));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.name} -> ${r.status} (${r.durationMs}ms) :: ${r.note}`);
  }

  console.log(`\nSummary: ${passed}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failed) {
      console.log(`- ${f.name} -> ${f.status} :: ${f.note}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Smoke test runner crashed", err);
  process.exit(1);
});
