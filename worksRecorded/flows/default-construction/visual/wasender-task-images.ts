import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/utils/db";

const expiresIn = 15 * 60_000;
const digest = (token: string) =>
	createHash("sha256").update(token).digest("hex");

export async function stageWasenderTaskImage(itemId: string, file: File) {
	const token = randomBytes(32).toString("base64url");
	const data = {
		tokenHash: digest(token),
		image: new Uint8Array(await file.arrayBuffer()),
		expiresAt: new Date(Date.now() + expiresIn),
	};
	await prisma.wasenderTaskImage.upsert({
		where: { itemId },
		create: { itemId, ...data },
		update: data,
	});
	const candidate = new URL(
		process.env.NEXT_PUBLIC_APP_URL || "https://www.worksrecorded.com",
	);
	const origin =
		candidate.protocol === "https:"
			? candidate.origin
			: "https://www.worksrecorded.com";
	return `${origin}/api/public/wasender-task-image/${token}`;
}

export async function getWasenderTaskImage(token: string) {
	if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
	return prisma.wasenderTaskImage.findFirst({
		where: { tokenHash: digest(token), expiresAt: { gt: new Date() } },
		select: { image: true },
	});
}

export async function discardWasenderTaskImages(
	itemIds: string[],
	tokenHash?: string,
) {
	await prisma.wasenderTaskImage.deleteMany({
		where: {
			OR: [
				{ itemId: { in: itemIds }, tokenHash },
				{ expiresAt: { lte: new Date() } },
			],
		},
	});
}
