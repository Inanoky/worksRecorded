export async function POST(req: Request): Promise<Response> {
  const body = await req.json();

  // You’ll later map this to DB / your schema.
  // For now, just acknowledge so Meta allows publish/send.
  return Response.json({ status: "ok" }, { status: 200 });
}