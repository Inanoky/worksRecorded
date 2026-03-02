// download_media.js
// Usage:
//   META_WA_TOKEN="EAAB..." node download_media.js
//
// Saves: downloaded_photo.jpg

const fs = require("fs");

const MEDIA_ID = "1444051457388686";
const GRAPH_VERSION = "v20.0"; // change if you use a different version

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing META_WA_TOKEN env var");
    process.exit(1);
  }

  // Step 1: Get temporary media URL
  const metaResp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${MEDIA_ID}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!metaResp.ok) {
    const txt = await metaResp.text();
    throw new Error(`Get media URL failed (${metaResp.status}): ${txt}`);
  }

  const metaJson = await metaResp.json();
  if (!metaJson.url) {
    throw new Error(`No url in response: ${JSON.stringify(metaJson)}`);
  }

  console.log("Temporary URL:", metaJson.url);
  console.log("mime_type:", metaJson.mime_type);

  // Step 2: Download the bytes from that URL (still needs Authorization header)
  const fileResp = await fetch(metaJson.url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    redirect: "follow",
  });

  if (!fileResp.ok) {
    const txt = await fileResp.text();
    throw new Error(`Download failed (${fileResp.status}): ${txt}`);
  }

  const arrayBuffer = await fileResp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outName = "downloaded_photo.jpg";
  fs.writeFileSync(outName, buffer);

  console.log(`✅ Saved ${buffer.length} bytes to ./${outName}`);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});