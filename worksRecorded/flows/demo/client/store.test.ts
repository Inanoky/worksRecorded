/** @jest-environment node */
import { DEMO_SITE_ID } from "../constants";
import warehouseSample from "./warehouse-sample.json";

const values = new Map<string, string>();
let invoke: typeof import("./actions").invokeLocalAction;
let store: typeof import("./store");
beforeEach(async () => {
	jest.resetModules();
	values.clear();
	Object.assign(globalThis, {
		window: {
			location: new URL("http://localhost/demo"),
			addEventListener: jest.fn(),
		},
		localStorage: {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
		},
	});
	store = await import("./store");
	invoke = (await import("./actions")).invokeLocalAction;
});

it("shares the fictional records between both original diary configurations", () => {
	const bis = store.getDiarySnapshot(true);
	const diary = store.getDiarySnapshot(false);
	expect(bis.diary).toBe(diary.diary);
	expect(bis.config.otherSettings.fimaCollaboration).toBe(true);
	expect(diary.config.otherSettings.fimaCollaboration).toBe(false);
	expect(diary.config.otherSettings.inlineDiaryPhotos).toBe(false);
	expect(diary.config.Works.DisplayName).toBe("Darbi");
	expect(diary.config.Location.DisplayName).toBe("Lokācija");
	const recordHours = store
		.getData()
		.snapshot.diary.rows.reduce(
			(total: number, row: Record<string, unknown>) =>
				total + Number(row.WorkersInvolved) * Number(row.TimeInvolved),
			0,
		);
	expect(recordHours).toBeGreaterThan(0);
	expect(
		store.getTimeRows().reduce((sum, row) => sum + row.timeWorked, 0),
	).toBe(recordHours);
	const dailyCounts = new Map<string, number>();
	for (const row of diary.diary.rows) {
		const day = row.Date.toISOString().slice(0, 10);
		dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
	}
	expect(dailyCounts.size).toBe(13);
	expect([...dailyCounts.values()].every((count) => count >= 10)).toBe(true);
});

it("persists record edits locally and recalculates matching Forma 2 costs", async () => {
	const row = store.getData().snapshot.diary.rows[0];
	const previous = store
		.getData()
		.snapshot.forma2.data.resultRows.find(
			(position: any) => position.name === row.Works,
		).actualWorkCost;
	await invoke("", "saveDefaultConstructionDiaryEdits", [
		{
			siteId: DEMO_SITE_ID,
			updates: [{ id: row.id, fields: { TimeInvolved: "5" } }],
			creates: [],
		},
	]);
	expect(store.getData().snapshot.diary.rows[0].TimeInvolved).toBe("5");
	expect(
		store
			.getData()
			.snapshot.forma2.data.resultRows.find(
				(position: any) => position.name === row.Works,
			).actualWorkCost,
	).toBe(previous + 50);
	const persisted = JSON.parse([...values.values()][0]);
	expect(persisted.snapshot.diary.rows[0].TimeInvolved).toBe("5");
});

it("copies photo ownership independently and removes only the deleted record attachment", async () => {
	const row = store.getData().snapshot.diary.rows[0];
	const original = store
		.getData()
		.photos.find((photo) => photo.diaryRecordId === row.id)!;
	const copy = await invoke("", "copySiteDiaryRecordToDate", [
		row.id,
		"2026-11-10",
	]);
	const copied = store
		.getData()
		.photos.find((photo) => photo.diaryRecordId === copy.id)!;
	expect(copied.id).not.toBe(original.id);
	await invoke("", "deletePhotoById", [copied.id]);
	expect(
		store.getData().snapshot.diary.rows.find((item: any) => item.id === copy.id)
			.Photos,
	).toEqual([]);
	expect(
		store.getData().snapshot.diary.rows.find((item: any) => item.id === row.id)
			.Photos,
	).toEqual(row.Photos);
});

it("saves polygon geometry through the original validator without any network", async () => {
	const item = store.getData().snapshot.drawings[0];
	const mark = item.drawing.state.marks[0];
	const polygon = mark.polygon.map((point: any) => ({
		...point,
		x: point.x + 0.001,
	}));
	const result = await invoke("", "saveVisualPolygonPatch", [
		DEMO_SITE_ID,
		item.drawing.id,
		{
			markId: mark.id,
			mutationId: crypto.randomUUID(),
			expectedPolygon: mark.polygon,
			polygon,
		},
	]);
	expect(result.ok).toBe(true);
	expect(
		store
			.getData()
			.snapshot.drawings[0].drawing.state.marks.find(
				(item: any) => item.id === mark.id,
			).polygon,
	).toEqual(polygon);
});

it("saves and archives the existing planning task locally", async () => {
	const item = store.getData().snapshot.drawings[0];
	const source = item.planning.plans[0];
	const input = {
		siteId: DEMO_SITE_ID,
		id: source.id,
		version: source.version,
		drawingId: item.drawing.id,
		work: source.work,
		location: source.location,
		unit: source.unit,
		quantity: 77,
		startDate: source.startDate,
		endDate: source.endDate,
		contactId: null,
		geometry: source.geometry,
	};
	const result = await invoke("", "saveVisualPlanningItem", [input]);
	expect(result.plan.quantity).toBe(77);
	const archived = await invoke("", "archiveVisualPlanningItem", [
		{ siteId: DEMO_SITE_ID, id: source.id },
	]);
	expect(archived.plan.archivedAt).toBeTruthy();
});

it("answers project reads locally and rejects external service calls without fetching", async () => {
	const fetch = jest.fn();
	Object.assign(globalThis, { fetch });
	const response = await store.localFetch(`/api/sites/${DEMO_SITE_ID}/visual`);
	expect((await response.json()).drawings).toHaveLength(2);
	await expect(
		invoke("", "sendSiteDiaryRecordToBis", ["record"]),
	).rejects.toThrow("ārējo pakalpojumu");
	const remote = await store.localFetch("/api/sites/another-project/visual");
	expect(remote.status).toBe(501);
	expect(fetch).not.toHaveBeenCalled();
});

it("returns both pages of gallery photos in the format the gallery expects", async () => {
	const endpoint = `/api/sites/${DEMO_SITE_ID}/photos`;
	const first = await (await store.localFetch(`${endpoint}?page=1`)).json();
	const second = await (await store.localFetch(`${endpoint}?page=2`)).json();
	const photos = [...first.photos, ...second.photos];

	expect(first.photos).toHaveLength(30);
	expect(second.photos.length).toBeGreaterThan(0);
	expect(first.totalCount).toBe(store.getData().photos.length);
	expect(second.totalCount).toBe(first.totalCount);
	expect(new Set(photos.map((photo) => photo.id)).size).toBe(first.totalCount);
	const dates = photos.map((photo) => photo.Date);
	expect(dates).toEqual([...dates].sort().reverse());
});

it("uses the same material record in the warehouse and Forma 2", async () => {
	const { warehouseRows, warehouseTableActions } = await import("./warehouse");
	const material = warehouseRows().find(
		(row) => row.forma2PositionId && row.cost !== null,
	);
	if (!material?.forma2PositionId || material.cost === null)
		throw new Error("Missing warehouse sample");
	const getPosition = () =>
		store
			.getData()
			.snapshot.forma2.data.resultRows.find(
				(position: { id: string }) => position.id === material.forma2PositionId,
			);
	const previous = getPosition().actualMaterialCost;
	await warehouseTableActions.updateMaterialDetails(material.id, {
		cost: material.cost + 10,
	});
	expect(getPosition().actualMaterialCost).toBe(previous + 10);
	const deliveryDate = new Date("2026-11-20T12:00:00.000Z");
	await warehouseTableActions.updateMaterialDate(material.id, deliveryDate);
	expect(warehouseRows().find((row) => row.id === material.id)).toMatchObject({
		materialDate: deliveryDate,
		invoiceDate: material.invoiceDate,
	});
	await invoke("", "saveDefaultConstructionForma2Allocations", [
		{
			siteId: DEMO_SITE_ID,
			allocations: [
				{
					sourceType: "material",
					sourceId: material.id,
					positionId: null,
					method: "manual",
				},
			],
		},
	]);
	expect(
		warehouseRows().find((row) => row.id === material.id)?.forma2PositionId,
	).toBeNull();
	expect(getPosition().actualMaterialCost).toBe(previous - material.cost);
});

it("imports the provided sample once and keeps its invoice group together", async () => {
	const { warehouseRows } = await import("./warehouse");
	const { groupWarehouseInvoiceRows } = await import(
		"@/lib/bis/warehouse-invoice-client"
	);
	const endpoint = "/api/warehouse/invoices/import";
	const runImport = async (receipt: string) =>
		(
			await store.localFetch(endpoint, {
				method: "POST",
				body: JSON.stringify({ receipt }),
			})
		).json();
	const before = warehouseRows().length;
	expect(await runImport("another-document")).toMatchObject({ ok: false });
	expect(await runImport(warehouseSample.sha256)).toEqual({
		ok: true,
		count: 3,
		duplicate: false,
	});
	expect(await runImport(warehouseSample.sha256)).toEqual({
		ok: true,
		count: 3,
		duplicate: true,
	});
	const rows = warehouseRows();
	expect(rows).toHaveLength(before + 3);
	expect(
		groupWarehouseInvoiceRows(rows).find(
			(invoice) => invoice.invoiceNumber === warehouseSample.invoiceNumber,
		),
	).toMatchObject({ itemCount: 3, totalCost: 170.6 });
});
