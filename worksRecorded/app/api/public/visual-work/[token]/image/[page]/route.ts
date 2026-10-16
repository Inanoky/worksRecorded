import { loadPublicVisualWork } from "@/flows/default-construction/visual/planning-share-store";
import { readLimitedBody } from "@/flows/default-construction/visual/share-body";

export const dynamic = "force-dynamic";
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string; page: string }> },
) {
	try {
		const { token, page } = await params;
		if (!/^[1-9]\d?$/.test(page)) return new Response(null, { status: 404 });
		const share = await loadPublicVisualWork(token);
		const image = share?.images.find((image) => image.page === Number(page));
		if (!image)
			return new Response(null, {
				status: 404,
				headers: { "Cache-Control": "no-store" },
			});
		const response = await fetch(image.url, {
			redirect: "error",
			signal: AbortSignal.timeout(15000),
			cache: "no-store",
		});
		if (!response.ok) throw new Error("Image unavailable");
		const bytes = await readLimitedBody(response.body, 600_000);
		if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
			throw new Error("Invalid image");
		return new Response(bytes, {
			headers: {
				"Content-Type": "image/jpeg",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
				"X-Robots-Tag": "noindex, nofollow, noarchive",
				"Referrer-Policy": "no-referrer",
			},
		});
	} catch {
		console.error("visual-planning-share: image unavailable");
		return new Response(null, {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}
}
