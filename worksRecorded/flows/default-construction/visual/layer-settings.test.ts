import {
	defaultVisualLayerSettings,
	projectVisualMarks,
	readVisualLayerSettings,
	removeVisualLayer,
	resolveVisualWorkLayer,
	visualLayerPositionIds,
	visualLayerSettingsSchema,
	visualLayerStyles,
} from "./layer-settings";
import type { VisualEvidence, VisualMark } from "./model";

const evidence: VisualEvidence = {
	id: "photo",
	recordId: "record",
	work: "XPS 150mm",
	photoUrl: "https://example.com/photo.jpg",
	location: "1. stāvs",
	description: "done",
	date: "2026-10-13",
	amount: 10,
	unit: "m2",
};
const mark: VisualMark = {
	id: "polygon",
	evidenceId: "photo",
	layer: "xps",
	page: 1,
	polygon: [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 1, y: 1 },
	],
	confidence: 0.9,
	anchors: ["A", "B"],
	explanation: "aligned",
	editedAt: "2026-10-01",
};

it("preserves the six default IDs and current keyword precedence", () => {
	const settings = readVisualLayerSettings({});
	expect(settings.categories.map((c) => c.id)).toEqual([
		"sand",
		"xps",
		"estrich",
		"film",
		"thermowhite",
		"other",
	]);
	expect(resolveVisualWorkLayer("XPS un plēve", settings)).toBe("xps");
	expect(resolveVisualWorkLayer("Sausā betona grīda 70mm", settings)).toBe(
		"estrich",
	);
	expect(resolveVisualWorkLayer("Nepazīstams darbs", settings)).toBe("other");
});

it("renames and recolours without changing assignments or geometry", () => {
	const settings = defaultVisualLayerSettings();
	settings.categories[1].label = "Siltumizolācija";
	settings.categories[1].color = "#123456";
	const projected = projectVisualMarks([mark], [evidence], "drawing", settings);
	expect(projected[0]).toEqual(mark);
	expect(projected[0].polygon).toBe(mark.polygon);
	expect(visualLayerStyles(settings).xps).toEqual({
		label: "Siltumizolācija",
		color: "#123456",
	});
});

it("uses explicit work mappings before keywords and keeps stable estimate links through a rename", () => {
	const settings = defaultVisualLayerSettings();
	settings.categories.push({
		id: "custom-thick",
		label: "XPS 150 mm",
		color: "#ffffff",
	});
	settings.works.push({
		work: "XPS 150mm",
		positionId: "estimate-1",
		layerId: "custom-thick",
	});
	expect(resolveVisualWorkLayer(" xps   150MM ", settings)).toBe(
		"custom-thick",
	);
	expect(resolveVisualWorkLayer("XPS 100mm", settings)).toBe("xps");
	expect(
		resolveVisualWorkLayer("Jauns darba nosaukums", settings, {
			"jauns darba nosaukums": "estimate-1",
		}),
	).toBe("custom-thick");
});

it("overrides only one polygon in one drawing, without modifying the diary work", () => {
	const settings = defaultVisualLayerSettings();
	settings.zones.push({
		drawingId: "drawing",
		markId: "polygon",
		layerId: "sand",
	});
	const result = projectVisualMarks(
		[mark, { ...mark, id: "other-polygon" }],
		[evidence],
		"drawing",
		settings,
	);
	expect(result.map((m) => m.layer)).toEqual(["sand", "xps"]);
	expect(
		projectVisualMarks([mark], [evidence], "other-drawing", settings)[0].layer,
	).toBe("xps");
	expect(evidence.work).toBe("XPS 150mm");
	expect(mark.layer).toBe("xps");
});

it("reassigns works, individual zones and future keyword matches when deleting categories", () => {
	const settings = defaultVisualLayerSettings();
	settings.works.push({ work: "XPS", layerId: "xps" });
	settings.zones.push({
		drawingId: "drawing",
		markId: "polygon",
		layerId: "xps",
	});
	const withoutXps = removeVisualLayer(settings, "xps", "sand");
	expect(withoutXps.categories.some((c) => c.id === "xps")).toBe(false);
	expect(withoutXps.works[0].layerId).toBe("sand");
	expect(withoutXps.zones[0].layerId).toBe("sand");
	expect(resolveVisualWorkLayer("XPS 200 mm", withoutXps)).toBe("sand");
	const withoutSand = removeVisualLayer(withoutXps, "sand", "other");
	expect(withoutSand.redirects.xps).toBe("other");
	expect(
		projectVisualMarks([mark], [evidence], "drawing", withoutSand),
	).toHaveLength(1);
	expect(() => removeVisualLayer(settings, "other", "sand")).toThrow();
});

it.each([
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.categories[0].label = " ";
	},
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.categories[0].label = "xps";
	},
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.categories[0].color = "javascript:alert(1)";
	},
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.categories.push({ ...s.categories[0] });
	},
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.works.push({ work: "XPS", layerId: "custom-missing" });
	},
	(s: ReturnType<typeof defaultVisualLayerSettings>) => {
		s.redirects.xps = "sand";
	},
])("rejects invalid or ambiguous settings", (change) => {
	const settings = defaultVisualLayerSettings();
	change(settings);
	expect(visualLayerSettingsSchema.safeParse(settings).success).toBe(false);
});

it("extracts existing Forma 2 IDs without changing rates", () => {
	expect(
		visualLayerPositionIds({
			otherSettings: {
				defaultConstructionForma2WorkSync: {
					documentId: "doc",
					entries: [{ positionId: "pos", work: " XPS 150mm " }],
				},
			},
		}),
	).toEqual({ "xps 150mm": "pos" });
});
