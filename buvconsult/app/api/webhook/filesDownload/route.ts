// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\api\webhook\filesDownload\route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const containerId = searchParams.get("containerId");
  const fileId = searchParams.get("fileId");
  const filenameParam = searchParams.get("filename"); // may be null

  if (!containerId || !fileId) {
    return new Response("Missing containerId or fileId", { status: 400 });
  }

  try {
    // Fetch file bytes + headers
    const fileResponse = await client.containers.files.content.retrieve(fileId, {
      container_id: containerId,
    });

    const contentType =
      fileResponse.headers.get("content-type") || "application/octet-stream";

    const filename = filenameParam || fileId;

    return new Response(fileResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("filesDownload error:", err);
    return new Response("Failed to download file", { status: 500 });
  }
}
