/** @jest-environment node */
import { DEMO_SITE_ID } from "../constants";

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
	expect(diary.config.otherSettings.inlineDiaryPhotos).toBe(true);
	expect(
		store.getTimeRows().reduce((sum, row) => sum + row.timeWorked, 0),
	).toBe(192);
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
