import type { BrowserDiaryEntry } from "@/lib/whatsapp-browser-sync/schema";
import { browserMaterialMetadata } from "./browser-import";

it("persists source-linked consumption separately from delivery and balance for future imports", () => {
	const source =
		"Estrich, plēve 50m²\n25 maisi. (30 maisi no noliktavas, atlikums objektā 32 maisi).";
	const entries = ["Estrich", "PE plēve"].map(
		(workText) =>
			({
				projectName: "Raudas 16",
				workText,
				workDate: "2026-11-17",
			}) as BrowserDiaryEntry,
	);
	const metadata = browserMaterialMetadata({
		site: { id: "raudas", name: "Raudas 16" },
		entries,
		originalText: source,
		payload: {
			idempotencyKey: "a".repeat(64),
			organizationId: "org",
			groupName: "group",
			attachments: [],
			sourceMessages: [
				{
					sourceId: "wa1",
					senderName: "Artis",
					sentAt: "2026-11-17T13:35:00Z",
					text: source,
					attachmentIndexes: [],
				},
			],
		},
	});
	expect(metadata.sourceMessageId).toBe("wa1");
	expect(
		metadata.materialConsumption.map((entry) => [entry.kind, entry.bags]),
	).toEqual([
		["consumed", 25],
		["delivered", 30],
		["balance", 32],
	]);
	expect(
		metadata.materialConsumption.every((entry) => entry.recordIds.length === 0),
	).toBe(true);
});
