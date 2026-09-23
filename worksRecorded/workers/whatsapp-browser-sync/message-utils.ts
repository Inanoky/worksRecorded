import { createHash } from "node:crypto";
import { DateTime } from "luxon";

export type LoadedWhatsappMessage = {
	sourceId: string;
	senderName: string;
	senderPhone: string | null;
	sentAt: string;
	text: string;
	hasImage: boolean;
};

export function parseWhatsappPrePlainText(
	value: string,
	timeZone = "Europe/Riga",
) {
	const match = value.match(
		/^\[(\d{1,2}):(\d{2}),\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})\]\s*(.+?):\s*$/,
	);
	if (!match) return null;
	const [, hour, minute, day, month, rawYear, senderName] = match;
	const year =
		Number(rawYear) < 100 ? 2_000 + Number(rawYear) : Number(rawYear);
	const date = DateTime.fromObject(
		{
			year,
			month: Number(month),
			day: Number(day),
			hour: Number(hour),
			minute: Number(minute),
		},
		{ zone: timeZone },
	);
	if (!date.isValid) return null;
	return { senderName: senderName.trim(), sentAt: date.toISO() };
}

export function extractPhone(value: string | null | undefined) {
	const match = value?.match(/\+\d[\d\s()-]{6,}\d/);
	return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

export function clusterWhatsappMessages(
	messages: LoadedWhatsappMessage[],
	windowSeconds = 180,
) {
	const clusters: LoadedWhatsappMessage[][] = [];
	for (const message of messages) {
		const current = clusters.at(-1);
		const previous = current?.at(-1);
		const differenceSeconds = previous
			? Math.abs(
					DateTime.fromISO(message.sentAt).diff(
						DateTime.fromISO(previous.sentAt),
						"seconds",
					).seconds,
				)
			: Number.POSITIVE_INFINITY;
		if (
			current &&
			previous &&
			previous.senderName === message.senderName &&
			differenceSeconds <= windowSeconds
		) {
			current.push(message);
		} else {
			clusters.push([message]);
		}
	}
	return clusters;
}

export function buildClusterIdempotencyKey(
	groupName: string,
	sourceIds: string[],
) {
	return createHash("sha256")
		.update(`${groupName}\n${sourceIds.join("\n")}`)
		.digest("hex");
}
