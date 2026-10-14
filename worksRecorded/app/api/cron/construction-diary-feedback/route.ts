import { runScheduledDiaryFeedback } from "@/flows/default-construction/backend/diary-feedback";

export const maxDuration = 300;

export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	try {
		const results = await runScheduledDiaryFeedback();
		return Response.json(
			{ results },
			{ status: results.some((item) => item.status === "failed") ? 207 : 200 },
		);
	} catch {
		console.error("[diary-feedback] scheduled job failed");
		return Response.json({ error: "Feedback update failed" }, { status: 500 });
	}
}
