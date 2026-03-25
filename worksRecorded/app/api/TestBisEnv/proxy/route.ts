import { NextRequest, NextResponse } from "next/server";

const TEST_BIS_HOST = "test.bis.gov.lv";

function isAllowedTarget(target: string) {
  try {
    const url = new URL(target);
    return url.protocol === "https:" && url.hostname === TEST_BIS_HOST;
  } catch {
    return false;
  }
}

function assertRelaySecret(request: NextRequest) {
  const expected = process.env.BIS_TEST_ENV_RELAY_SECRET?.trim();
  if (!expected) return true;

  const provided = request.headers.get("x-bis-relay-secret")?.trim();
  return Boolean(provided && provided === expected);
}

async function handle(request: NextRequest) {
  if (!assertRelaySecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = request.nextUrl.searchParams.get("target");
  if (!target || !isAllowedTarget(target)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-port");
  headers.delete("x-forwarded-proto");
  headers.delete("x-bis-relay-secret");

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function PATCH(request: NextRequest) {
  return handle(request);
}

export async function PUT(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
