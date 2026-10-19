import { Prisma } from "@prisma/client";
import {
	constructionDiaryListSelect,
	mapConstructionDiaryListRecord,
} from "./diary-list-record";

it("keeps FIMA metadata selection on the construction model, not ZTC", () => {
	const fields =
		Prisma.dmmf.datamodel.models
			.find((model) => model.name === "sitediaryrecords")
			?.fields.map((field) => field.name) ?? [];
	expect(
		Object.keys(constructionDiaryListSelect).filter(
			(field) => !fields.includes(field),
		),
	).toEqual([]);
	expect(constructionDiaryListSelect.evalMetadata).toBe(true);
	expect(constructionDiaryListSelect).not.toHaveProperty("pausedAt");
	expect(constructionDiaryListSelect).not.toHaveProperty("pauseIntervals");
});

it("retains FIMA BIS links, review status and materials on construction records", () => {
	const state = {
		version: 7,
		status: "ready_for_approval",
		materials: [{ id: "material", label: "Concrete", unit: "m3", quantity: 2 }],
		history: [],
	};
	const result = mapConstructionDiaryListRecord({
		id: "fima",
		fimaNumber: 42,
		BISId: "123",
		evalMetadata: {
			kuceImport: { bisLinks: [{ id: "123", number: "456" }] },
			fimaCollaboration: state,
		},
	});
	expect(result).toMatchObject({
		fimaNumber: 42,
		fimaBisRecords: [{ id: "123", number: "456" }],
		hasFimaBisReferences: true,
		fimaCollaboration: state,
	});
});

it("keeps normal construction and Limeni records readable without FIMA metadata", () => {
	expect(
		mapConstructionDiaryListRecord({ id: "limeni", Amounts: 0, Photos: [] }),
	).toMatchObject({
		id: "limeni",
		Amounts: "0",
		Photos: [],
		fimaBisRecords: [],
		hasFimaBisReferences: false,
	});
	expect(mapConstructionDiaryListRecord({}).fimaCollaboration).toBeUndefined();
});
