jest.mock("@/lib/utils/db", () => ({
	prisma: {
		fimaWorkRecord: {
			findFirstOrThrow: jest.fn(),
			updateMany: jest.fn(),
			update: jest.fn(),
		},
		fimaBisOperation: {
			create: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
			findFirst: jest.fn(),
		},
		fimaWorkRevision: { create: jest.fn() },
		$transaction: jest.fn(),
	},
}));
jest.mock("./access", () => ({
	fimaAccess: jest.fn(async () => ({ userId: "u", organizationId: "org" })),
}));
jest.mock("./bis-client", () => ({
	fimaBisClient: jest.fn(),
	FimaBisError: class extends Error {
		constructor(
			public status: number,
			message: string,
		) {
			super(message);
		}
	},
}));

import { prisma } from "@/lib/utils/db";
import { emptyProposal } from "../lib/records";
import { FimaBisError, fimaBisClient } from "./bis-client";
import { executeFimaBis, linkFimaBis, refreshFimaBis } from "./operations";

const request = jest.fn(),
	list = jest.fn();
let current: any;
beforeEach(() => {
	jest.clearAllMocks();
	current = {
		id: "row",
		organizationId: "org",
		siteId: "site",
		version: 1,
		stage: "ready",
		managed: false,
		bisId: null,
		bisCaseId: null,
		bisStatus: null,
		proposal: {
			...emptyProposal("2026-09-04"),
			description: "Exact source text",
			quantity: 2,
			measurement: "110",
			workers: 8,
			start: "19:00",
			end: "05:00",
			responsibleId: "1",
			responsibleType: "logbooks_responsible_person",
			buildingIds: ["2"],
			reviewed: true,
			authorMode: "api",
		},
	};
	(prisma.fimaWorkRecord.findFirstOrThrow as jest.Mock).mockImplementation(
		async () => current,
	);
	(prisma.fimaWorkRecord.updateMany as jest.Mock).mockResolvedValue({
		count: 1,
	});
	(prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
		typeof fn === "function" ? fn(prisma) : Promise.all(fn),
	);
	jest.mocked(fimaBisClient).mockResolvedValue({
		bisCaseId: "case",
		site: { bisConstructionRoundId: null },
		request,
		list,
	} as any);
	list.mockImplementation(async (path) =>
		path.startsWith("available_responsible")
			? [
					{
						attributes: {
							responsible_person_id: 1,
							responsible_person_type: "logbooks_responsible_person",
						},
					},
				]
			: path.includes("case_buildings")
				? [{ id: "2" }]
				: [],
	);
});
test("blocks foreign records before any BIS request", async () => {
	current.bisId = "99";
	current.bisStatus = "draft";
	await expect(executeFimaBis("row", 1, "zero", false)).rejects.toThrow(
		"aizsargāts",
	);
	expect(request).not.toHaveBeenCalled();
});
test("requires explicit API creator acceptance", async () => {
	await expect(executeFimaBis("row", 1, "create", false)).rejects.toThrow(
		"autorību",
	);
	expect(request).not.toHaveBeenCalled();
});
test("does not send after a competing edit wins the version lock", async () => {
	(prisma.fimaWorkRecord.updateMany as jest.Mock).mockResolvedValue({
		count: 0,
	});
	await expect(executeFimaBis("row", 1, "create", true)).rejects.toThrow(
		"Rinda mainīta",
	);
	expect(request).not.toHaveBeenCalled();
});
test("persists unknown outcome and never retries an ambiguous create", async () => {
	request.mockRejectedValue(new Error("timeout"));
	await expect(executeFimaBis("row", 1, "create", true)).rejects.toThrow(
		"netiks automātiski atkārtota",
	);
	expect(request).toHaveBeenCalledTimes(1);
	expect(prisma.fimaBisOperation.update).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ status: "unknown" }),
		}),
	);
	expect(prisma.fimaBisOperation.create).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ dedupeKey: expect.any(String) }),
		}),
	);
});
test("a definite validation rejection allows correction without claiming creation", async () => {
	request.mockRejectedValue(new FimaBisError(422, "invalid material"));
	await expect(executeFimaBis("row", 1, "create", true)).rejects.toThrow(
		"noraidīja",
	);
	expect(prisma.fimaBisOperation.update).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ status: "rejected", dedupeKey: null }),
		}),
	);
});
test("rechecks live approval status immediately before material changes", async () => {
	current = {
		...current,
		bisId: "99",
		managed: true,
		bisStatus: "draft",
		bisCaseId: "case",
	};
	request.mockImplementation(async (path) =>
		path === "performed_works/99"
			? { data: { attributes: { status: "approved" } } }
			: {},
	);
	await expect(executeFimaBis("row", 1, "zero", false)).rejects.toThrow(
		"vairs nav sagatave",
	);
	expect(request.mock.calls.every((c) => c[1] === undefined)).toBe(true);
	expect(prisma.fimaBisOperation.create).not.toHaveBeenCalled();
});

function reference() {
	const p = current.proposal;
	return {
		description: p.description,
		event_date: { from: p.date },
		event_time: { from: p.start, to: p.end },
		detail: {
			quantity: { count: String(p.quantity), measurement: p.measurement },
			employees: p.workers,
		},
		responsible_person: { id: p.responsibleId },
		case_buildings: p.buildingIds.map((id: string) => ({ id })),
		project_documents: [],
		used_construction_materials: [],
	};
}
test("creates once and verifies returned ID, exact description and quantities", async () => {
	const ref = reference();
	request.mockImplementation(async (path, method) =>
		method === "POST"
			? { data: { id: "123" } }
			: path.endsWith("reference_data")
				? ref
				: { data: { attributes: { status: "draft" } } },
	);
	await expect(executeFimaBis("row", 1, "create", true)).resolves.toEqual({
		id: "row",
		bisId: "123",
		status: "verified",
	});
	expect(request.mock.calls.filter((c) => c[1] === "POST")).toHaveLength(1);
	expect(prisma.fimaWorkRecord.update).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ bisId: "123", managed: true }),
		}),
	);
});
test("zeroing materials changes no work quantity or description in the PATCH", async () => {
	const ref = reference(),
		before = [
			{ id: "usage", attributes: { construction_material_id: 7, quantity: 3 } },
		];
	let patched = false;
	current = {
		...current,
		bisId: "123",
		bisCaseId: "case",
		bisStatus: "draft",
		managed: true,
		stage: "recorded",
		snapshot: { reference: ref, materials: before },
	};
	request.mockImplementation(async (path, method) => {
		if (method === "PATCH") {
			patched = true;
			return { data: { id: "123" } };
		}
		return path.endsWith("reference_data")
			? ref
			: { data: { attributes: { status: "draft" } } };
	});
	list.mockImplementation(async () =>
		patched
			? [
					{
						id: "usage",
						attributes: { construction_material_id: 7, quantity: 0 },
					},
				]
			: before,
	);
	await executeFimaBis("row", 1, "zero", false);
	const body = request.mock.calls.find((c) => c[1] === "PATCH")?.[2];
	expect(body.data.attributes).toBeUndefined();
	expect(Object.keys(body.data.relationships)).toEqual([
		"logbook_used_construction_materials",
	]);
	expect(
		body.data.relationships.logbook_used_construction_materials.data[0]
			.attributes.quantity,
	).toBe(0);
});
test("a stale unacknowledged operation becomes unknown without sending again", async () => {
	current = {
		...current,
		stage: "executing",
		updatedAt: new Date(Date.now() - 600000),
	};
	await expect(refreshFimaBis("row")).resolves.toEqual({ needsLink: true });
	expect(request).not.toHaveBeenCalled();
	expect(prisma.fimaWorkRecord.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ stage: "unknown" }),
		}),
	);
});
test("an active operation cannot be unlocked by refresh", async () => {
	current = { ...current, stage: "executing", updatedAt: new Date() };
	await expect(refreshFimaBis("row")).rejects.toThrow("vēl var darboties");
	expect(prisma.fimaWorkRecord.updateMany).not.toHaveBeenCalled();
});
test("manually linked browser record stays protected from API updates", async () => {
	request.mockImplementation(async (path) =>
		path.endsWith("reference_data")
			? reference()
			: { data: { attributes: { status: "draft" } } },
	);
	await linkFimaBis("row", 1, "123");
	expect(prisma.fimaWorkRecord.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ bisId: "123", managed: false }),
		}),
	);
});
