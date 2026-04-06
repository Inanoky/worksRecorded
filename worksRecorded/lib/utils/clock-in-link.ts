import { createHmac } from "crypto";

type ClockInTokenPayload = {
  workerId: string;
  siteId: string;
  exp: number;
  businessPhoneNumberId?: string;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function getClockInSecret() {
  return (
    process.env.CLOCKIN_LINK_SECRET ||
    process.env.WEBHOOK_VERIFY_TOKEN ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function createClockInToken(payload: {
  workerId: string;
  siteId: string;
  ttlSeconds?: number;
  businessPhoneNumberId?: string;
}) {
  const secret = getClockInSecret();
  if (!secret) throw new Error("Missing CLOCKIN_LINK_SECRET (or fallback secret).");

  const exp = Math.floor(Date.now() / 1000) + (payload.ttlSeconds ?? 15 * 60);
  const body: ClockInTokenPayload = {
    workerId: payload.workerId,
    siteId: payload.siteId,
    exp,
    businessPhoneNumberId: payload.businessPhoneNumberId,
  };

  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = createHmac("sha256", secret).update(encodedBody).digest("base64url");
  return `${encodedBody}.${signature}`;
}

export function verifyClockInToken(token: string): ClockInTokenPayload | null {
  const secret = getClockInSecret();
  if (!secret) return null;

  const [encodedBody, signature] = token.split(".");
  if (!encodedBody || !signature) return null;

  const expected = createHmac("sha256", secret).update(encodedBody).digest("base64url");
  if (expected !== signature) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedBody)) as ClockInTokenPayload;
    if (!parsed?.workerId || !parsed?.siteId || typeof parsed?.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type GeoPoint = { lat: number; lng: number };

export function parseGeofencePolygon(raw: unknown): GeoPoint[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((point: any) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

export function isPointInsidePolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}
