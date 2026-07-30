export const DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY =
	"defaultConstructionForma2WorkSync";

export type DefaultConstructionForma2WorkSyncEntry = {
	positionId: string;
	work: string;
	ownedByForma2: boolean;
};

export type DefaultConstructionForma2WorkSyncManifest = {
	version: 1;
	documentId: string;
	entries: DefaultConstructionForma2WorkSyncEntry[];
};

const text = (value: unknown, maxLength: number) =>
	String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);

export const normalizeForma2WorkOptionKey = (value: unknown) =>
	text(value, 200).toLocaleLowerCase("lv");

export function getDefaultConstructionForma2WorkSyncManifest(
	config: Record<string, any>,
): DefaultConstructionForma2WorkSyncManifest | null {
	const raw = config?.otherSettings?.[DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY];
	const documentId = text(raw?.documentId, 180);
	if (!documentId || !Array.isArray(raw?.entries)) return null;

	const seenPositionIds = new Set<string>();
	const entries = raw.entries.flatMap((entry: any) => {
		const positionId = text(entry?.positionId, 180);
		const work = text(entry?.work, 200);
		if (!positionId || !work || seenPositionIds.has(positionId)) return [];
		seenPositionIds.add(positionId);
		return [
			{
				positionId,
				work,
				ownedByForma2: entry?.ownedByForma2 === true,
			},
		];
	});

	return { version: 1, documentId, entries };
}

export function getDefaultConstructionForma2SourceByWork(
	config: Record<string, any>,
) {
	const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
	if (!manifest) return new Map();
	return new Map(
		manifest.entries.map((entry) => [
			normalizeForma2WorkOptionKey(entry.work),
			{
				type: "forma2" as const,
				documentId: manifest.documentId,
				positionId: entry.positionId,
				ownedByForma2: entry.ownedByForma2,
			},
		]),
	);
}
