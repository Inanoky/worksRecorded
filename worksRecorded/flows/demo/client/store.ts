import baseConfig from "@/components/sitediary/configs/defaultConfigLV_27042026.json";
import { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import {
	buildForma2AnalyticsView,
	extractForma2PositionsFromRows,
	suggestForma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";
import { resolveVisualWorkLayer } from "@/flows/default-construction/visual/layer-settings";
import { compareVisualPlanProgress } from "@/flows/default-construction/visual/planning-model";
import { DEMO_SITE_ID } from "../constants";
import fixture from "./fixture.json";

type LocalRecord = Record<string, any>;
export type LocalData = {
	snapshot: LocalRecord;
	workers: LocalRecord[];
	timelogs: LocalRecord[];
	photos: LocalRecord[];
	documents: LocalRecord[];
	beginRows: LocalRecord[];
	dailyPlans?: LocalRecord[];
	feedback?: LocalRecord;
};
const storageKey = "worksrecorded:ozolu:client:v1";
const listeners = new Set<() => void>();
let data = hydrate(structuredClone(fixture) as LocalData);
let restored = false;
const diaries = new Map<boolean, any>();
function hydrate(value: LocalData) {
	for (const item of value.snapshot.drawings) {
		for (const contact of item.planning.contacts) {
			if (contact.id === "ozolu-contact") contact.id = "member:ozolu-user";
		}
	}
	for (const row of [
		...value.snapshot.diary.rows,
		...value.timelogs,
		...value.photos,
	]) {
		for (const key of [
			"Date",
			"Date_Custom_1",
			"Date_Custom_2",
			"createdAt",
			"startTime",
			"endTime",
			"date",
		]) {
			if (typeof row[key] === "string" && row[key])
				row[key] = new Date(row[key]);
		}
	}
	return value;
}
export function getData() {
	return data;
}
export function getTimeRows() {
	return data.timelogs.map((row) => {
		const worker = data.workers.find((worker) => worker.id === row.workerId);
		const time = (value: string | null) =>
			value
				? new Date(value).toLocaleTimeString("lv-LV", {
						timeZone: "Europe/Riga",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
						hour12: false,
					})
				: "";
		return {
			id: row.id,
			date: new Date(row.date)
				.toLocaleDateString("lv-LV", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				})
				.replace(/\.$/, ""),
			clockIn: time(row.clockIn),
			clockOut: time(row.clockOut),
			timeWorked:
				row.clockIn && row.clockOut
					? Math.round(
							(new Date(row.clockOut).getTime() -
								new Date(row.clockIn).getTime()) /
								36000,
						) / 100
					: 0,
			location: row.wocation ?? "",
			works: row.works ?? "",
			workerName: [worker?.name, worker?.surname].filter(Boolean).join(" "),
			workerRole: worker?.role ?? "",
		};
	});
}
export function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
export function restoreData() {
	if (restored || typeof window === "undefined") return;
	restored = true;
	let saved: string | null;
	try {
		saved = localStorage.getItem(storageKey);
	} catch {
		return;
	}
	if (saved) {
		try {
			const parsed = JSON.parse(saved);
			if (parsed.snapshot?.settings?.siteId === DEMO_SITE_ID)
				data = hydrate(parsed);
		} catch {
			localStorage.removeItem(storageKey);
		}
	}
	notify();
}
function notify() {
	diaries.clear();
	for (const listener of listeners) listener();
}
export function saveLocal(change: (draft: LocalData) => void) {
	const next = structuredClone(data);
	change(next);
	next.snapshot.version = `local:${crypto.randomUUID()}`;
	synchronize(next);
	const encoded = JSON.stringify(next);
	localStorage.setItem(storageKey, encoded);
	data = next;
	notify();
	return data;
}
function synchronize(next: LocalData) {
	const rows = next.snapshot.diary.rows as LocalRecord[];
	const costs = next.snapshot.forma2.data.clientCosts;
	costs.sources = costs.sources.filter(
		(source: LocalRecord) =>
			source.type !== "work" || rows.some((row) => row.id === source.id),
	);
	for (const row of rows) {
		const source = costs.sources.find(
			(item: LocalRecord) => item.type === "work" && item.id === row.id,
		);
		const hours =
			Number(row.WorkersInvolved || 0) * Number(row.TimeInvolved || 0);
		if (row.beginSalaryAllocation)
			row.beginSalaryAllocation.totalCents = Math.round(hours * 1250);
		const fields = {
			label: row.Works,
			secondaryLabel: row.Location,
			date: new Date(row.Date).toISOString(),
			quantity: Number(row.Amounts) || null,
			reportedQuantity: Number(row.Amounts) || null,
			unit: row.Units,
			hours,
			actualCost: hours * 12.5,
		};
		if (source) Object.assign(source, fields);
		else {
			const position = costs.positions.find(
				(position: LocalRecord) => position.name === row.Works,
			);
			costs.sources.push({
				id: row.id,
				type: "work",
				selectedPositionId: position?.id ?? null,
				hourlyRate: 12.5,
				...fields,
			});
			if (position)
				costs.allocations.push({
					method: "manual",
					sourceId: row.id,
					sourceType: "work",
					positionId: position.id,
				});
		}
	}
	next.snapshot.forma2.data.resultRows = buildForma2AnalyticsView({
		...costs,
		includeSuggestions: false,
	}).resultRows;
	const actuals = rows.map((row) => ({
		id: row.id,
		date: new Date(row.Date).toISOString().slice(0, 10),
		work: row.Works,
		location: row.Location,
		unit: row.Units,
		quantity: Number(row.Amounts) || null,
	}));
	for (const item of next.snapshot.drawings) {
		item.drawing.state.evidence = item.drawing.state.evidence.filter(
			(evidence: LocalRecord) =>
				rows.some((row) => row.id === evidence.recordId),
		);
		const evidenceIds = new Set(
			item.drawing.state.evidence.map((evidence: LocalRecord) => evidence.id),
		);
		item.drawing.state.marks = item.drawing.state.marks.filter(
			(mark: LocalRecord) => evidenceIds.has(mark.evidenceId),
		);
		for (const evidence of item.drawing.state.evidence) {
			const row = rows.find((row) => row.id === evidence.recordId);
			if (!row) continue;
			Object.assign(evidence, {
				work: row.Works,
				location: row.Location,
				description: row.Comments,
				date: new Date(row.Date).toISOString(),
				amount: Number(row.Amounts) || null,
				unit: row.Units,
			});
			for (const mark of item.drawing.state.marks.filter(
				(mark: LocalRecord) => mark.evidenceId === evidence.id,
			))
				mark.layer = resolveVisualWorkLayer(
					row.Works,
					next.snapshot.index.layerConfiguration.settings,
				);
		}
		item.planning.plans = item.planning.plans.map((plan: LocalRecord) => ({
			...plan,
			progress: compareVisualPlanProgress(
				plan as any,
				actuals as any,
				new Date().toISOString().slice(0, 10),
			),
		}));
	}
}
export function getDiarySnapshot(bis: boolean) {
	if (diaries.has(bis)) return diaries.get(bis);
	const config = bis
		? data.snapshot.config
		: buildDefaultConstructionDiaryConfig({
				organizationId: LIMENI_ORGANIZATION_ID,
				siteDiaryRecordsMap: {
					...structuredClone(baseConfig),
					Location: {
						...baseConfig.Location,
						DropDownOptions: data.snapshot.config.Location.DropDownOptions,
					},
					Works: {
						...baseConfig.Works,
						DropDownOptions: data.snapshot.config.Works.DropDownOptions,
					},
					Units: {
						...baseConfig.Units,
						DropDownOptions: data.snapshot.config.Units.DropDownOptions,
					},
					otherSettings: {
						...data.snapshot.config.otherSettings,
						fimaCollaboration: false,
						preferConfigDisplayNames: false,
					},
				},
			});
	const snapshot = { ...data.snapshot, config };
	diaries.set(bis, snapshot);
	return snapshot;
}
export function localDrawingUrl(id: string) {
	const item = data.snapshot.drawings.find(
		(item: LocalRecord) => item.drawing.id === id,
	);
	return item?.drawing.state.location.startsWith("1")
		? "/demo/floor-1.pdf"
		: "/demo/floor-2.pdf";
}
export function readFileDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}
export async function localFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const url = new URL(
		input instanceof Request ? input.url : String(input),
		typeof window === "undefined" ? "http://localhost" : window.location.origin,
	);
	const prefix = `/api/sites/${DEMO_SITE_ID}`;
	const json = (value: unknown) =>
		new Response(JSON.stringify(value), {
			headers: { "content-type": "application/json" },
		});
	if (url.pathname.startsWith(prefix)) {
		const route = url.pathname.slice(prefix.length);
		if (route === "/limeni-project" || route === "/limeni-workspace")
			return json(
				route === "/limeni-workspace" ? data.snapshot.settings : data.snapshot,
			);
		if (route === "/visual") return json(data.snapshot.index);
		const drawingId = route.split("/")[2];
		const item = data.snapshot.drawings.find(
			(item: LocalRecord) => item.drawing.id === drawingId,
		);
		if (item && url.searchParams.has("pdf"))
			return globalThis.fetch(localDrawingUrl(drawingId));
		if (item && route.endsWith("/planning")) return json(item.planning);
		if (item) return json(item.drawing);
		if (route === "/forma2/results") return json(data.snapshot.forma2);
		if (route === "/forma2/extract" && init?.body instanceof FormData) {
			const file = init.body.get("file");
			if (!(file instanceof Blob))
				return new Response("Missing file", { status: 400 });
			const XLSX = await import("xlsx");
			const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
			return json({
				sheets: workbook.SheetNames.map((sheetName) =>
					extractForma2PositionsFromRows(
						XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }),
						sheetName,
					),
				),
			});
		}
		if (route === "/forma2/auto-assign") {
			let assigned = 0;
			saveLocal((draft) => {
				const costs = draft.snapshot.forma2.data.clientCosts;
				for (const source of costs.sources) {
					if (
						costs.allocations.some(
							(item: LocalRecord) => item.sourceId === source.id,
						)
					)
						continue;
					const match = suggestForma2Position(source, costs.positions);
					if (!match || match.confidence < 0.8) continue;
					costs.allocations.push({
						sourceId: source.id,
						sourceType: source.type,
						positionId: match.positionId,
						method: "automatic",
						confidence: match.confidence,
					});
					assigned++;
				}
			});
			return json({ assigned });
		}
	}
	if (url.pathname.startsWith("/api/")) {
		const { invokeLocalAction } = await import("./actions");
		if (url.pathname.includes("photos")) return json(data.photos);
		if (url.pathname.includes("diary"))
			return json(
				await invokeLocalAction(
					"",
					url.pathname.includes("filters")
						? "getSiteDiaryFilters"
						: "getLimeniDiarySnapshot",
					[],
				),
			);
		if (url.pathname.includes("schema"))
			return json({
				locations: data.snapshot.index.locations,
				works: data.snapshot.drawings[0].planning.workOptions.map(
					(item: LocalRecord) => item.work,
				),
			});
		return new Response(
			JSON.stringify({
				error:
					"Šī darbība izmanto servera pakalpojumu. Ozolu dati tiek glabāti šajā pārlūkā.",
			}),
			{ status: 501, headers: { "content-type": "application/json" } },
		);
	}
	if (
		url.origin !== window.location.origin &&
		!["blob:", "data:"].includes(url.protocol)
	)
		throw new Error("Ozolu projektam tiek izmantoti tikai lokāli materiāli.");
	return globalThis.fetch(input, init);
}
if (typeof window !== "undefined") {
	window.addEventListener("works-recorded:project-patch", (event) => {
		const detail = (event as CustomEvent).detail;
		if (detail?.siteId === DEMO_SITE_ID && typeof detail.apply === "function")
			saveLocal((draft) => {
				draft.snapshot = detail.apply(draft.snapshot);
			});
	});
	window.addEventListener("storage", (event) => {
		if (event.key === storageKey && event.newValue) {
			data = hydrate(JSON.parse(event.newValue));
			notify();
		}
	});
}
