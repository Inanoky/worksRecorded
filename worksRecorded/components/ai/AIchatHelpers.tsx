// C:\...\components\ai\AIchatHelpers.tsx

// Find ANY data: URL (base64 OR urlencoded) in the text
export function extractDataUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/data:[^\s]+/g) ?? [];

  // Strip common trailing punctuation like ) ] " '
  return matches.map((m) => m.replace(/[)\]\>,"']+$/g, ""));
}

export async function downloadDataUrl(url: string, filename?: string) {
  const res = await fetch(url);
  const blob = await res.blob();

  const ext = blob.type.split("/")[1] || "bin";
  const finalName = filename ?? `buvconsult-file-${Date.now()}.${ext}`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
