import { prisma } from "@/lib/utils/db";
import {
	archiveVisualPlanningContact,
	listVisualPlanningContacts,
	persistVisualPlanningContact,
	restoreVisualPlanningContact,
} from "./planning-contacts";
import { requireVisualAccess } from "./store";

jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		visualPlanningContact: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
			updateMany: jest.fn(),
			findUniqueOrThrow: jest.fn(),
		},
	},
}));

const siteId = "33333333-3333-4333-8333-333333333333";
const contactId = "11111111-1111-4111-8111-111111111111";

function stored(overrides: Record<string, unknown> = {}) {
	return {
		id: contactId,
		siteId,
		name: "Anna Bērziņa",
		phone: "37120000000",
		archivedAt: null,
		createdAt: new Date("2026-10-13T08:00:00Z"),
		updatedAt: new Date("2026-10-13T08:00:00Z"),
		...overrides,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireVisualAccess).mockResolvedValue({} as never);
	jest.mocked(prisma.visualPlanningContact.findMany).mockResolvedValue([]);
	jest.mocked(prisma.visualPlanningContact.findFirst).mockResolvedValue(null);
	jest
		.mocked(prisma.visualPlanningContact.create)
		.mockResolvedValue(stored() as never);
	jest.mocked(prisma.visualPlanningContact.updateMany).mockResolvedValue({
		count: 1,
	});
	jest
		.mocked(prisma.visualPlanningContact.findUniqueOrThrow)
		.mockResolvedValue(stored() as never);
});

it("lists project contacts and keeps archived contacts available for history", async () => {
	jest.mocked(prisma.visualPlanningContact.findMany).mockResolvedValue([
		stored(),
		stored({
			id: "22222222-2222-4222-8222-222222222222",
			name: "Jānis Ozols",
			phone: "37121111111",
			archivedAt: new Date("2026-10-13T10:00:00Z"),
		}),
	] as never);

	await expect(listVisualPlanningContacts("user", siteId)).resolves.toEqual([
		expect.objectContaining({ name: "Anna Bērziņa", archivedAt: null }),
		expect.objectContaining({
			name: "Jānis Ozols",
			archivedAt: "2026-10-13T10:00:00.000Z",
		}),
	]);
	expect(requireVisualAccess).toHaveBeenCalledWith("user", siteId);
});

it("creates a contact with a canonical international phone number", async () => {
	const contact = await persistVisualPlanningContact("user", {
		siteId,
		name: " Anna Bērziņa ",
		phone: "+371 20 000 000",
	});

	expect(prisma.visualPlanningContact.create).toHaveBeenCalledWith({
		data: {
			siteId,
			name: "Anna Bērziņa",
			phone: "37120000000",
		},
	});
	expect(contact).toMatchObject({ name: "Anna Bērziņa", phone: "37120000000" });
});

it("rejects duplicate project phone numbers", async () => {
	jest.mocked(prisma.visualPlanningContact.findFirst).mockResolvedValue({
		id: "22222222-2222-4222-8222-222222222222",
	} as never);

	await expect(
		persistVisualPlanningContact("user", {
			siteId,
			name: "Cits kontakts",
			phone: "+37120000000",
		}),
	).rejects.toThrow("jau ir saglabāts");
	expect(prisma.visualPlanningContact.create).not.toHaveBeenCalled();
});

it("updates, archives, and restores only contacts from the selected project", async () => {
	await persistVisualPlanningContact("user", {
		siteId,
		id: contactId,
		name: "Anna Ozola",
		phone: "37120000001",
	});
	expect(prisma.visualPlanningContact.updateMany).toHaveBeenCalledWith({
		where: { id: contactId, siteId, archivedAt: null },
		data: { name: "Anna Ozola", phone: "37120000001" },
	});

	await archiveVisualPlanningContact("user", { siteId, id: contactId });
	expect(prisma.visualPlanningContact.updateMany).toHaveBeenLastCalledWith({
		where: { id: contactId, siteId, archivedAt: null },
		data: { archivedAt: expect.any(Date) },
	});

	await restoreVisualPlanningContact("user", { siteId, id: contactId });
	expect(prisma.visualPlanningContact.updateMany).toHaveBeenLastCalledWith({
		where: { id: contactId, siteId, archivedAt: { not: null } },
		data: { archivedAt: null },
	});
});
