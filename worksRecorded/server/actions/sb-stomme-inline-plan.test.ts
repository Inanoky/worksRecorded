jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({
		getUser: jest.fn().mockResolvedValue({ id: "user" }),
	}),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: jest.fn() },
		sitediaryrecords: { updateMany: jest.fn() },
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest
		.fn()
		.mockResolvedValue("default-construction"),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { SB_STOMME_ORGANIZATION_ID } from "@/flows/default-construction/sb-stomme-inline-plan/model";
import { prisma } from "@/lib/utils/db";
import { saveSbStommePlanRow } from "./sb-stomme-inline-plan";

const expected = { weather: "Sun", plannedWork: "Walls", plannedAmount: null };
const values = {
	weather: "Rain",
	plannedWork: "Panels",
	plannedAmount: "12,5",
};
const edit = { recordId: "row", expected, values };
describe("SB STOMME row plan saving", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			organizationId: SB_STOMME_ORGANIZATION_ID,
			status: "active",
		} as never);
		jest
			.mocked(prisma.sitediaryrecords.updateMany)
			.mockResolvedValue({ count: 1 });
	});
	it("atomically updates exactly the three plan fields for the selected row", async () => {
		expect(await saveSbStommePlanRow(edit)).toEqual({
			ok: true,
			values: { ...values, plannedAmount: "12.5" },
		});
		expect(prisma.sitediaryrecords.updateMany).toHaveBeenCalledTimes(1);
		expect(prisma.sitediaryrecords.updateMany).toHaveBeenCalledWith({
			where: {
				id: "row",
				archivedAt: null,
				Site: { organizationId: SB_STOMME_ORGANIZATION_ID },
				Works_Custom_1: "Walls",
				Works_Custom_2: "Sun",
				Comments_Custom_2: null,
			},
			data: {
				Works_Custom_1: "Panels",
				Works_Custom_2: "Rain",
				Comments_Custom_2: "12.5",
			},
		});
	});
	it("rejects users outside SB STOMME", async () => {
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			organizationId: "other",
			status: "active",
		} as never);
		expect(await saveSbStommePlanRow(edit)).toMatchObject({ ok: false });
		expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
	});
	it("does not overwrite stale, archived or inaccessible rows", async () => {
		jest
			.mocked(prisma.sitediaryrecords.updateMany)
			.mockResolvedValue({ count: 0 });
		expect(await saveSbStommePlanRow(edit)).toMatchObject({ ok: false });
	});
	it("rejects actual field injection and invalid quantities before any write", async () => {
		for (const invalid of [
			{ ...values, Amounts: "15" },
			{ ...values, plannedAmount: "-15" },
		]) {
			expect(
				await saveSbStommePlanRow({ ...edit, values: invalid }),
			).toMatchObject({ ok: false });
		}
		expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
	});
	it("supports clearing the plan without touching actual diary fields", async () => {
		expect(
			await saveSbStommePlanRow({
				...edit,
				values: { weather: "", plannedWork: " ", plannedAmount: "" },
			}),
		).toEqual({
			ok: true,
			values: { weather: null, plannedWork: null, plannedAmount: null },
		});
		expect(prisma.sitediaryrecords.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					Works_Custom_1: null,
					Works_Custom_2: null,
					Comments_Custom_2: null,
				},
			}),
		);
	});
});
