import { getWasenderTaskImage } from "@/flows/default-construction/visual/wasender-task-images";

const headers = {
	"Cache-Control": "private, no-store",
	"X-Content-Type-Options": "nosniff",
	"X-Robots-Tag": "noindex, nofollow",
};

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string }> },
) {
	const { token } = await params;
	const row = await getWasenderTaskImage(token);
	if (!row) return new Response(null, { status: 404, headers });
	return new Response(new Uint8Array(row.image), {
		headers: { ...headers, "Content-Type": "image/jpeg" },
	});
}
