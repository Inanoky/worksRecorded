import { Buffer } from "buffer";

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

export async function fetchWhatsAppMediaAsBuffer(url: string) {
  console.log("🌐 [fetchWhatsAppMediaAsBuffer] fetching media from:", url);
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing META_ACCESS_TOKEN for WhatsApp media download");
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "follow",
    });
    console.log("✅ [fetchWhatsAppMediaAsBuffer] response status:", res.status, res.statusText);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log("📦 [fetchWhatsAppMediaAsBuffer] buffer size:", buf.length);
    return buf;
  } catch (err) {
    console.error("❌ [fetchWhatsAppMediaAsBuffer] fetch failed:", err);
    throw err;
  }
}
