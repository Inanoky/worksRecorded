export type BisMaterialOption = {
	id: string;
	label: string;
	measurementUnit?: string | null;
	deliveredQuantity?: number;
	usedQuantity?: number;
	availableQuantity: number;
};

export type GalleryAttachmentOption = {
	id: string;
	url: string;
	date?: Date | string | null;
	comment?: string | null;
};

export type BisResponsiblePersonOption = {
	id: string;
	personId: number | null;
	fullName: string | null;
	role: string | null;
	responsiblePersonId: number | null;
	responsiblePersonType: string | null;
};

export type BisSendOptions = {
	materials: BisMaterialOption[];
	attachments: GalleryAttachmentOption[];
	measurements: Array<{ id: string; name: string }>;
	responsiblePeople: BisResponsiblePersonOption[];
};

export type BisDiaryLink = {
	id: string;
	BISId: string | null;
	bisStatus: string | null;
};

export function mergeBisDiaryLinks<
	T extends { id?: string; BISId?: string | null; bisStatus?: string | null },
>(rows: T[], baseline: BisDiaryLink[], updates: BisDiaryLink[]): T[] {
	const previous = new Map(baseline.map((row) => [row.id, row]));
	const latest = new Map(updates.map((row) => [row.id, row]));
	return rows.map((row) => {
		const before = row.id ? previous.get(row.id) : undefined;
		const update = row.id ? latest.get(row.id) : undefined;
		if (
			!before ||
			!update ||
			(row.BISId ?? null) !== before.BISId ||
			(row.bisStatus ?? null) !== before.bisStatus
		)
			return row;
		return { ...row, BISId: update.BISId, bisStatus: update.bisStatus };
	});
}
