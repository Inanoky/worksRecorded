import { Buffer } from "buffer";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export function getString(fd: FormData, key: string) {
  const v = fd.get(key);
  const result = typeof v === "string" ? v : (v as any)?.toString?.() ?? null;
  console.log(`🔍 [getString] key="${key}", raw=`, v, "→ result=", result);
  return result;
}

export async function normalizePhone(waId: string | null, from: string | null) {
  const normalized = waId || (from || "").replace("whatsapp:+", "");
  console.log(`📞 [normalizePhone] waId=${waId}, from=${from} → normalized=${normalized}`);
  return normalized;
}

export async function fetchTwilioMediaAsBuffer(url: string, provider: "twilio" | "meta" = "twilio") {
  console.log("🌐 [fetchTwilioMediaAsBuffer] fetching media from:", url);
  const isMetaMedia =
    provider === "meta" || /(facebook\.com|fbcdn\.net|fbsbx\.com|lookaside)/i.test(url);
  try {
    const token = process.env.META_ACCESS_TOKEN;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const headers = isMetaMedia ? { Authorization: `Bearer ${token}` } : { Authorization: `Basic ${basicAuth}` };
    console.log("🌐 [fetchTwilioMediaAsBuffer] auth mode", {
      provider,
      isMetaMedia,
      usingBearer: isMetaMedia,
    });

    const res = await fetch(url, { headers, redirect: "follow" });
    const contentType = res.headers.get("content-type") || "";
    console.log("✅ [fetchTwilioMediaAsBuffer] response status:", res.status, res.statusText, { contentType });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("❌ [fetchTwilioMediaAsBuffer] non-OK response body:", text);
      throw new Error(`Media download failed: ${res.status} ${res.statusText}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    console.log("📦 [fetchTwilioMediaAsBuffer] buffer size:", buf.length);
    if (buf.length < 1024) {
      console.warn("⚠️ [fetchTwilioMediaAsBuffer] very small media payload", {
        bytes: buf.length,
        provider,
        contentType,
      });
    }
    return buf;
  } catch (err) {
    console.error("❌ [fetchTwilioMediaAsBuffer] fetch failed:", err);
    throw err;
  }
}
