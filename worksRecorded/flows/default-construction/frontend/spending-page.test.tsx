import SpendingPage from "@/app/dashboard/sites/[siteId]/spending/page";
import { getProjectNavLinks } from "@/components/dashboard/NavLinks";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";
import { DefaultConstructionSpendingDemo } from "./DefaultConstructionSpendingDemo";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("not-found");
	},
}));
jest.mock("./DefaultConstructionSpendingDemo", () => ({
	DefaultConstructionSpendingDemo: () => null,
}));

beforeEach(() => jest.clearAllMocks());

it("checks project access before serving the Limeni demonstration", async () => {
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ organizationId: LIMENI_ORGANIZATION_ID } as never);
	const page = await SpendingPage({
		params: Promise.resolve({ siteId: "site" }),
	});
	expect(orgCheck).toHaveBeenCalledWith("user", "site");
	expect(page.type).toBe(DefaultConstructionSpendingDemo);
});

it("does not expose the Limeni route to another organization", async () => {
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ organizationId: "another-org" } as never);
	await expect(
		SpendingPage({ params: Promise.resolve({ siteId: "site" }) }),
	).rejects.toThrow("not-found");
});

it("adds spending navigation only alongside the Limeni visual workspace", () => {
	expect(
		getProjectNavLinks("lv", { showVisual: true }).some(
			(link) => link.path === "spending",
		),
	).toBe(true);
	expect(
		getProjectNavLinks("lv", { showAnalytics: true }).some(
			(link) => link.path === "spending",
		),
	).toBe(false);
});
