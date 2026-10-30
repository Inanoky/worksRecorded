import { z } from "zod";
import {
	type FimaAcceptanceAct,
	getFimaAcceptanceActUrl,
} from "./acceptance-acts";
import {
	type FimaBisRecordLink,
	isFimaBisWorkRecordLink,
	readFimaBisRecordLinks,
} from "./bis-record-links";
import { fimaStatusSchema } from "./diary-collaboration";

export const fimaActReferenceSchema = z.object({
	siteId: z.string().uuid(),
	caseId: z.string().regex(/^\d+$/),
	collection: z.string().regex(/^[a-z][a-z_]*_acts$/),
	id: z.string().regex(/^\d+$/),
});
export type FimaActReference = z.infer<typeof fimaActReferenceSchema>;
const eventSchema = z.object({
	id: z.string(),
	requestId: z.string(),
	kind: z.enum(["examples", "comment", "status"]),
	text: z.string(),
	at: z.string(),
	actorId: z.string(),
	actorName: z.string(),
});
const settingSchema = z.object({
	number: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
	status: fimaStatusSchema.nullable().optional(),
	examples: z.array(fimaActReferenceSchema),
	history: z.array(eventSchema),
});
const registerSchema = z.object({
	version: z.literal(1),
	nextNumber: z.number().int().positive(),
	entries: z.record(z.string(), settingSchema),
});
export type FimaActSetting = z.infer<typeof settingSchema>;
export type FimaActRegister = z.infer<typeof registerSchema>;
export type FimaActSite = {
	id: string;
	name: string;
	bisCaseId: string | null;
	config: unknown;
};
export type FimaActDiaryRecord = {
	siteId?: string;
	id: string;
	fimaNumber: number | null;
	BISId: string | null;
	Date: string | null;
	Works: string | null;
	Works_Custom_1: string | null;
	Location: string | null;
	Amounts: number | null;
	Units: string | null;
	bisStatus: string | null;
	metadata: unknown;
	drafts: unknown;
};
export type FimaTrackedAct = FimaAcceptanceAct & {
	key: string;
	checkedAt: string | null;
	plannedWorks: { id: string; quantity: number | null }[];
	projectPageIds: string[];
	attachmentIds: string[];
	records: FimaActDiaryRecord[];
	title: string | null;
};
export type FimaActChoice = FimaActReference & {
	siteName: string;
	caseId: string;
	number: string | null;
	date: string | null;
	status: string;
	title: string | null;
	url: string;
};
export type FimaActRow = Omit<FimaTrackedAct, "records"> & {
	siteId: string;
	localNumber: string;
	setting: FimaActSetting;
	examples: (FimaActChoice | (FimaActReference & { unavailable: true }))[];
	records: (Omit<FimaActDiaryRecord, "metadata" | "drafts"> & {
		fimaBisRecords: FimaBisRecordLink[];
	})[];
};
export type FimaActsData = {
	siteId: string;
	siteName: string;
	caseId: string;
	checkedAt: string | null;
	rows: FimaActRow[];
	choices: FimaActChoice[];
	references?: FimaActSource[];
};
export type FimaActWorkScope = Pick<
	FimaActRow,
	"siteId" | "works" | "plannedWorks" | "records"
>;
export type FimaActSource = FimaActWorkScope & FimaActReference;
export function fimaActWorkScope(
	siteId: string,
	act: FimaTrackedAct,
): FimaActWorkScope {
	return {
		siteId,
		works: act.works,
		plannedWorks: act.plannedWorks,
		records: act.records.map(({ metadata, drafts: _drafts, ...record }) => ({
			...record,
			fimaBisRecords: readFimaActWorkLinks({
				...record,
				metadata,
				drafts: null,
			}),
		})),
	};
}

export function actKey(collection: string, id: string) {
	return `${collection}/${id}`;
}
export function formatFimaActNumber(number: number) {
	return `FIMA-AKT-${String(number).padStart(6, "0")}`;
}
export function readFimaActRegister(config: unknown): FimaActRegister {
	const value = (config as { otherSettings?: { fimaActRegister?: unknown } })
		?.otherSettings?.fimaActRegister;
	return value == null
		? { version: 1, nextNumber: 1, entries: {} }
		: registerSchema.parse(value);
}
export function allocateFimaActNumbers(state: FimaActRegister, keys: string[]) {
	const result = { ...state, entries: { ...state.entries } };
	const used = new Set(
		Object.values(state.entries).map((entry) => entry.number),
	);
	for (const key of [...new Set(keys)].sort((a, b) =>
		a.localeCompare(b, "en", { numeric: true }),
	)) {
		if (result.entries[key]) continue;
		while (used.has(result.nextNumber)) result.nextNumber++;
		result.entries[key] = {
			number: result.nextNumber,
			revision: 0,
			examples: [],
			history: [],
		};
		used.add(result.nextNumber++);
	}
	return result;
}
function object(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
export function readFimaActWorkLinks(record: FimaActDiaryRecord) {
	return [
		...new Map(
			[
				...readFimaBisRecordLinks(record.metadata),
				...readFimaBisRecordLinks(record.metadata, record.BISId),
			]
				.filter(isFimaBisWorkRecordLink)
				.map((link) => [link.id, link]),
		).values(),
	];
}
function strings(value: unknown) {
	return Array.isArray(value)
		? [
				...new Set(
					value.filter(
						(id): id is string => typeof id === "string" && /^\d+$/.test(id),
					),
				),
			]
		: [];
}
function workList(value: unknown) {
	return Array.isArray(value)
		? value.flatMap((work) => {
				const item = object(work);
				return /^\d+$/.test(String(item.id ?? ""))
					? [
							{
								id: String(item.id),
								quantity:
									typeof item.quantity === "number" &&
									Number.isFinite(item.quantity) &&
									item.quantity >= 0
										? item.quantity
										: null,
							},
						]
					: [];
			})
		: [];
}
function validAt(value: unknown) {
	return typeof value === "string" && Number.isFinite(Date.parse(value))
		? value
		: null;
}
export function readTrackedFimaActs(
	site: FimaActSite,
	records: FimaActDiaryRecord[] = [],
): FimaTrackedAct[] {
	const index = object(object(site.config).otherSettings).fimaBisActCoverage;
	const cached = object(index);
	const valid =
		cached.version === 1 &&
		cached.caseId === site.bisCaseId &&
		validAt(cached.fetchedAt);
	const result = new Map<string, FimaTrackedAct>();
	const add = (raw: unknown, fallbackAt: unknown, plannedOnly = false) => {
		const item = object(raw);
		const id = String(item.id ?? "");
		if (
			typeof item.collection !== "string" ||
			!getFimaAcceptanceActUrl(item.collection, id) ||
			typeof item.status !== "string"
		)
			return;
		const key = actKey(item.collection, id);
		const old = result.get(key);
		const at = validAt(item.checkedAt) ?? validAt(fallbackAt);
		const manual =
			item.nativeAccomplishedWorksLinked === false ||
			item.linkSource === "worksrecorded_draft_attachment";
		const native =
			!manual && (!plannedOnly || item.nativeAccomplishedWorksLinked === true);
		const preferOld =
			old &&
			(old.checkedAt ? Date.parse(old.checkedAt) : 0) >=
				(at ? Date.parse(at) : 0);
		const proposed: FimaTrackedAct = {
			key,
			id,
			collection: item.collection,
			number: typeof item.number === "string" ? item.number : null,
			date: typeof item.date === "string" ? item.date : (old?.date ?? null),
			status: item.status,
			title:
				typeof item.title === "string"
					? item.title
					: typeof item.description === "string"
						? item.description
						: (old?.title ?? null),
			checkedAt: at,
			works: native ? workList(item.works ?? item.plannedWorks) : [],
			plannedWorks: workList(item.plannedWorks ?? (manual ? item.works : [])),
			projectPageIds: strings(item.projectPageIds),
			attachmentIds: strings(item.attachmentIds),
			records: old?.records ?? [],
		};
		const chosen = preferOld ? old : proposed;
		result.set(key, {
			...chosen,
			projectPageIds: [
				...new Set([
					...(old?.projectPageIds ?? []),
					...proposed.projectPageIds,
				]),
			],
			attachmentIds: [
				...new Set([...(old?.attachmentIds ?? []), ...proposed.attachmentIds]),
			],
			plannedWorks: chosen.plannedWorks.length
				? chosen.plannedWorks
				: old?.plannedWorks.length
					? old.plannedWorks
					: proposed.plannedWorks,
		});
	};
	if (valid && Array.isArray(cached.acts))
		for (const act of cached.acts) add(act, cached.fetchedAt);
	for (const record of records) {
		const drafts = object(record.drafts).records;
		if (!Array.isArray(drafts)) continue;
		for (const draft of drafts) {
			const item = object(draft);
			if (item.caseId !== site.bisCaseId) continue;
			add(item, item.checkedAt, true);
		}
	}
	const byWork = new Map<string, FimaTrackedAct[]>();
	for (const act of result.values())
		for (const id of new Set(
			[...act.works, ...act.plannedWorks].map((work) => work.id),
		)) {
			const list = byWork.get(id) ?? [];
			list.push(act);
			byWork.set(id, list);
		}
	for (const record of records)
		for (const link of readFimaActWorkLinks(record))
			for (const act of byWork.get(link.id) ?? [])
				if (!act.records.some((row) => row.id === record.id))
					act.records.push(record);
	return [...result.values()].sort(
		(a, b) =>
			(b.date ?? "").localeCompare(a.date ?? "") ||
			b.id.localeCompare(a.id, "en", { numeric: true }),
	);
}
export function actChoices(
	site: FimaActSite,
	acts: FimaTrackedAct[],
): FimaActChoice[] {
	if (!site.bisCaseId) return [];
	return acts.map((act) => ({
		siteId: site.id,
		siteName: site.name,
		caseId: site.bisCaseId as string,
		id: act.id,
		collection: act.collection,
		number: act.number,
		date: act.date,
		status: act.status,
		title:
			act.title ??
			([
				...new Set(act.records.map((record) => record.Works).filter(Boolean)),
			].join("; ") ||
				null),
		url: getFimaAcceptanceActUrl(act.collection, act.id) as string,
	}));
}
export function makeFimaActRows(
	siteId: string,
	acts: FimaTrackedAct[],
	register: FimaActRegister,
	choices: FimaActChoice[],
): FimaActRow[] {
	const byChoice = new Map(
		choices.map((choice) => [
			`${choice.siteId}:${choice.caseId}:${actKey(choice.collection, choice.id)}`,
			choice,
		]),
	);
	return acts.map((act) => {
		const setting = register.entries[act.key];
		if (!setting) throw new Error("Aktam nav piešķirts FIMA numurs.");
		return {
			...act,
			siteId,
			localNumber: formatFimaActNumber(setting.number),
			setting,
			examples: setting.examples.map(
				(reference) =>
					byChoice.get(
						`${reference.siteId}:${reference.caseId}:${actKey(reference.collection, reference.id)}`,
					) ?? { ...reference, unavailable: true as const },
			),
			records: fimaActWorkScope(siteId, act).records,
		};
	});
}
