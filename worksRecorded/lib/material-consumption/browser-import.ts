import type {
	BrowserDiaryEntry,
	BrowserWhatsappIngest,
} from "@/lib/whatsapp-browser-sync/schema";
import { extractMaterialSource } from "./extract";
import { materialSourceHash, normalizeMaterialText } from "./model";

export function browserMaterialMetadata(args: {
	site: { id: string; name: string };
	entries: BrowserDiaryEntry[];
	payload: BrowserWhatsappIngest;
	originalText: string;
}) {
	const names = [...new Set(args.entries.map((entry) => entry.projectName))];
	const current = args.entries.filter(
		(entry) =>
			normalizeMaterialText(entry.projectName) ===
			normalizeMaterialText(args.site.name),
	);
	const entries = current.length
		? current
		: names.length === 1
			? args.entries
			: [];
	const sourceKey = `report:${args.site.id}:${materialSourceHash(args.originalText)}`;
	const first = args.payload.sourceMessages[0];
	const observations = extractMaterialSource({
		records: [
			{
				id: sourceKey,
				siteId: args.site.id,
				Date: entries[0]?.workDate
					? `${entries[0].workDate}T12:00:00Z`
					: first.sentAt,
				Works: entries.map((entry) => entry.workText).join("\n"),
				originalUserComment: args.originalText,
				evalMetadata: {
					sourceMessageIds: args.payload.sourceMessages.map(
						(message) => message.sourceId,
					),
					reporterName: first.senderName,
				},
			},
		],
		project: args.site,
		siblings: names.map((name) => ({
			id:
				normalizeMaterialText(name) === normalizeMaterialText(args.site.name) ||
				names.length === 1
					? args.site.id
					: `source-project:${name}`,
			name,
		})),
		sourceKey,
	}).map((entry) => ({ ...entry, recordIds: [] }));
	return {
		source: "whatsapp_browser_sync",
		sourceMessageId: first.sourceId,
		sourceMessageIds: args.payload.sourceMessages.map(
			(message) => message.sourceId,
		),
		sourceTimestamp: first.sentAt,
		reporterName: first.senderName,
		reporterPhone: first.senderPhone ?? null,
		materialConsumptionVersion: 1,
		materialConsumption: observations,
	};
}
