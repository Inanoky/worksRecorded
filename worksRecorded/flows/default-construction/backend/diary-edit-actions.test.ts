import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { saveDefaultConstructionDiaryEdits } from "./diary-edit-actions";
import { syncDiaryEditAssignments } from "./diary-forma2-sync";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findUnique: jest.fn() }, $transaction: jest.fn() },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("./diary-forma2-sync", () => ({
	syncDiaryEditAssignments: jest.fn(),
}));

const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const newId = "79867920-ab26-41a6-9bd8-f3ea10ffa452";
const hashId =
	"877bb126fb14a32408b002daf4d6f3911b74382c197666b652670e6fb48f8693";
function row(id = hashId) {
	return {
		id,
		siteId,
		organizationId: "org",
		userId: "user",
		archivedAt: null,
		Date: new Date("2026-10-14T08:00:00Z"),
		createdAt: new Date("2026-10-14T08:00:00Z"),
		Works: "XPS",
		Comments: "Old comment",
		Amounts: 10,
		WorkersInvolved: 2,
		TimeInvolved: 5,
		Photos: ["original-photo"],
		User: null,
		Worker: null,
	};
}
let stored: Map<string, ReturnType<typeof row>>;
const tx = {
	sitediaryrecords: {
		findMany: jest.fn(),
		updateMany: jest.fn(),
		createMany: jest.fn(),
	},
};
beforeEach(() => {
	jest.resetAllMocks();
	stored = new Map([[hashId, row()]]);
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ id: siteId, organizationId: "org" } as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
	jest
		.mocked(prisma.site.findUnique)
		.mockResolvedValue({ siteDiaryRecordsMap: {} } as never);
	jest.mocked(syncDiaryEditAssignments).mockResolvedValue(undefined);
	tx.sitediaryrecords.findMany.mockImplementation(async ({ where }) =>
		[...stored.values()].filter(
			(record) =>
				where.id.in.includes(record.id) &&
				(!where.siteId || record.siteId === where.siteId),
		),
	);
	tx.sitediaryrecords.updateMany.mockImplementation(async ({ where, data }) => {
		const old = stored.get(where.id);
		if (!old) return { count: 0 };
		stored.set(where.id, { ...old, ...data });
		return { count: 1 };
	});
	tx.sitediaryrecords.createMany.mockImplementation(async ({ data }) => {
		for (const value of data) {
			expect(value).not.toHaveProperty("OR");
			expect(value.organizationId).toBe("org");
		}
		for (const value of data)
			stored.set(value.id, { ...row(value.id), ...value });
		return { count: data.length };
	});
	jest.mocked(prisma.$transaction).mockImplementation(async (work: unknown) => {
		const backup = new Map(stored);
		try {
			return await (work as (tx: unknown) => Promise<unknown>)(tx);
		} catch (error) {
			stored = backup;
			throw error;
		}
	});
});

it("saves a comment delta without remapping Forma 2 or overwriting hours and photos", async () => {
	const saved = await saveDefaultConstructionDiaryEdits({
		siteId,
		updates: [{ id: hashId, fields: { Comments: "Edited" } }],
		creates: [],
	});
	expect(requireUser).toHaveBeenCalledTimes(1);
	expect(orgCheck).toHaveBeenCalledTimes(1);
	expect(syncDiaryEditAssignments).not.toHaveBeenCalled();
	expect(stored.get(hashId)).toMatchObject({
		Comments: "Edited",
		TimeInvolved: 5,
		Amounts: 10,
		Photos: ["original-photo"],
	});
	expect(saved.rows[0]).toMatchObject({
		id: hashId,
		Comments: "Edited",
		TimeInvolved: "5",
	});
});

it("saves a whole day in one transaction and synchronizes changed works once", async () => {
	stored.set(newId, row(newId));
	await saveDefaultConstructionDiaryEdits({
		siteId,
		updates: [
			{ id: hashId, fields: { Works: "Sand" } },
			{ id: newId, fields: { Works: "Concrete" } },
		],
		creates: [],
	});
	expect(prisma.$transaction).toHaveBeenCalledTimes(1);
	expect(syncDiaryEditAssignments).toHaveBeenCalledTimes(1);
	expect(syncDiaryEditAssignments).toHaveBeenCalledWith(tx, siteId, [
		{ id: hashId, work: "Sand" },
		{ id: newId, work: "Concrete" },
	]);
});

it("rolls back row updates if Forma 2 synchronization fails", async () => {
	jest
		.mocked(syncDiaryEditAssignments)
		.mockRejectedValue(new Error("Conflict"));
	await expect(
		saveDefaultConstructionDiaryEdits({
			siteId,
			updates: [{ id: hashId, fields: { Works: "Sand" } }],
			creates: [],
		}),
	).rejects.toThrow("Conflict");
	expect(stored.get(hashId)?.Works).toBe("XPS");
});

it("reuses the client UUID when a new-row save is retried", async () => {
	const input = {
		siteId,
		updates: [],
		creates: [
			{
				clientId: newId,
				fields: { Date: new Date("2026-10-14"), Works: "Sand", Amounts: 0 },
			},
		],
	};
	await saveDefaultConstructionDiaryEdits(input);
	await saveDefaultConstructionDiaryEdits(input);
	expect(tx.sitediaryrecords.createMany).toHaveBeenCalledTimes(1);
	expect(stored.get(newId)?.Amounts).toBe(0);
	expect(stored.size).toBe(2);
});

it.each(["foreign", "archived", "missing"])(
	"rejects %s records before changing any row",
	async (reason) => {
		if (reason === "foreign") stored.set(hashId, { ...row(), siteId: "other" });
		if (reason === "archived")
			stored.set(hashId, { ...row(), archivedAt: new Date() } as never);
		if (reason === "missing") stored.delete(hashId);
		await expect(
			saveDefaultConstructionDiaryEdits({
				siteId,
				updates: [{ id: hashId, fields: { Comments: "Edit" } }],
				creates: [],
			}),
		).rejects.toThrow();
		expect(tx.sitediaryrecords.updateMany).not.toHaveBeenCalled();
	},
);

it.each([
	"ztc-production",
	"default-production",
	"fima",
	"sprinkler-attendance",
])("rejects %s without touching operational records", async (flow) => {
	jest.mocked(resolveFlowModuleKeyForRuntime).mockResolvedValue(flow);
	await expect(
		saveDefaultConstructionDiaryEdits({ siteId, updates: [], creates: [] }),
	).rejects.toThrow();
	expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("rejects ownership, source-photo and BIS fields supplied by the client", async () => {
	await expect(
		saveDefaultConstructionDiaryEdits({
			siteId,
			updates: [
				{ id: hashId, fields: { userId: "other", Photos: [] } as never },
			],
			creates: [],
		}),
	).rejects.toThrow();
	expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("supports legacy organization-null records when their project is authorized", async () => {
	stored.set(hashId, { ...row(), organizationId: null } as never);
	await saveDefaultConstructionDiaryEdits({
		siteId,
		updates: [{ id: hashId, fields: { Comments: "Edit" } }],
		creates: [],
	});
	expect(tx.sitediaryrecords.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId,
				OR: [{ organizationId: "org" }, { organizationId: null }],
			}),
		}),
	);
});
