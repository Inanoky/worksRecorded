import { Prisma } from "@prisma/client";
import { mapZtcDiaryListRecord, ztcDiaryListSelect } from "./diary-list-record";

jest.mock("@/lib/fima/diary-collaboration", () => {
	throw new Error("ZTC diary reads must not load FIMA collaboration");
});
jest.mock("@/lib/fima/bis-record-links", () => {
	throw new Error("ZTC diary reads must not load FIMA BIS mapping");
});
jest.mock("@/lib/utils/db", () => {
	throw new Error("Row mapping must not access the database");
});

it("selects only fields present on the generated ZTC Prisma model", () => {
	const model = Prisma.dmmf.datamodel.models.find(
		(entry) => entry.name === "ZtcRecords",
	);
	if (!model) throw new Error("ZTC model missing");
	const fields = new Set(model.fields.map((field) => field.name));
	expect(
		Object.keys(ztcDiaryListSelect).filter((field) => !fields.has(field)),
	).toEqual([]);
	expect(ztcDiaryListSelect).not.toHaveProperty("evalMetadata");
	expect(ztcDiaryListSelect).not.toHaveProperty("archivedAt");
	expect(ztcDiaryListSelect).not.toHaveProperty("saveBatchId");
	expect(ztcDiaryListSelect).toMatchObject({
		pausedAt: true,
		pauseIntervals: true,
	});
});

it("maps ZTC time, pay inputs and attachments without reading FIMA metadata", () => {
	const record = {
		id: "ztc",
		Works: "CNC",
		Amounts: 0,
		TimeInvolved: 1.5,
		WorkersInvolved: 13,
		pausedAt: new Date("2026-10-16T09:00:00Z"),
		pauseIntervals: [
			{ start: "2026-10-16T08:00:00Z", end: "2026-10-16T08:15:00Z" },
		],
		Worker: { name: "Worker", surname: "Name" },
		Photos: ["https://example.com/photo.jpg"],
		get evalMetadata() {
			throw new Error("FIMA metadata must not be accessed");
		},
	};
	const result = mapZtcDiaryListRecord(record);
	expect(result).toMatchObject({
		id: "ztc",
		Works: "CNC",
		Amounts: "0",
		TimeInvolved: "1.5",
		WorkersInvolved: "13",
		createdBy: "Worker Name",
		pausedAt: record.pausedAt,
		pauseIntervals: record.pauseIntervals,
		Photos: record.Photos,
	});
	expect(
		Object.keys(result).filter((key) => /fima|evalMetadata/i.test(key)),
	).toEqual([]);
});

it("preserves creator fallback and empty-value behavior for legacy ZTC rows", () => {
	expect(
		mapZtcDiaryListRecord({ originalUserComment: "Worker Name : work" }),
	).toMatchObject({
		createdBy: "Worker Name",
		Amounts: "",
		WorkersInvolved: "",
		TimeInvolved: "",
		Photos: [],
		pausedAt: null,
		pauseIntervals: [],
	});
	expect(
		mapZtcDiaryListRecord({
			User: { firstName: "Manager", lastName: "" },
			Worker: { name: "Worker" },
		}).createdBy,
	).toBe("Manager");
	expect(mapZtcDiaryListRecord({}).createdBy).toBe("N/A");
});
