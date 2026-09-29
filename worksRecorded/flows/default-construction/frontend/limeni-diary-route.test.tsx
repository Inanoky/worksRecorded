import { render, screen } from "@testing-library/react";
import Page from "@/app/dashboard/sites/[siteId]/dashboard/page";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { orgCheck } from "@/server/actions/shared-actions";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";

jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("Not found");
	},
	redirect: () => {
		throw new Error("Redirect");
	},
}));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user" }),
}));
jest.mock("@/lib/utils/super-user", () => ({ isSuperUserId: () => false }));
jest.mock("@/server/actions/shared-actions", () => ({
	orgCheck: jest.fn(),
	getOrganizationLanguageByUserId: async () => "lv",
	getSiteOrganizationIdBySiteId: jest.fn(),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/lib/flows/registry", () => ({
	shouldShowDashboardAiWidgetForFlowModule: () => false,
}));
jest.mock("@/server/actions/BIS/service", () => ({
	getSiteBisConfig: async () => null,
	getUserBisTokenByUserId: async () => null,
}));
jest.mock("@/server/onboarding/send-first-project-welcome-template", () => ({
	sendFirstProjectWelcomeTemplateForUserIfNeeded: jest.fn(),
}));
jest.mock("@/components/ai/AiChatLazy", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/components/joyride/TourRunner", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/components/joyride/JoyRideSteps", () => ({
	getJoyRideSteps: () => ({ steps_dashboard_siteid_dashboard: [] }),
}));
jest.mock("@/components/client-flows/ClientFlowDashboard", () => ({
	ClientFlowDashboard: () => <div>Standard flow</div>,
}));
jest.mock("./RetainedLimeniDiary", () => ({
	RegisterLimeniDiary: ({
		siteId,
		userId,
		organizationId,
	}: {
		siteId: string;
		userId: string;
		organizationId: string;
	}) => (
		<div data-testid="retained">{`${siteId}:${userId}:${organizationId}`}</div>
	),
	ClearRetainedDiary: () => <div>Clear retained diary</div>,
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(orgCheck).mockResolvedValue({
		name: "Project",
		organizationId: LIMENI_ORGANIZATION_ID,
	} as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
});

it("selects the retained client diary only after checking access to a Limeni construction project", async () => {
	render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
	expect(orgCheck).toHaveBeenCalledWith("user", "site");
	expect(screen.getByTestId("retained")).toHaveTextContent(
		`site:user:${LIMENI_ORGANIZATION_ID}`,
	);
	expect(screen.queryByText("Standard flow")).not.toBeInTheDocument();
});

it("keeps other organizations on their existing flow and clears any retained diary", async () => {
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ name: "Project", organizationId: "other" } as never);
	render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
	expect(screen.getByText("Standard flow")).toBeInTheDocument();
	expect(screen.getByText("Clear retained diary")).toBeInTheDocument();
	expect(screen.queryByTestId("retained")).not.toBeInTheDocument();
});

it("does not enable retention for a different flow or an inaccessible project", async () => {
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-production");
	const { unmount } = render(
		await Page({ params: Promise.resolve({ siteId: "site" }) }),
	);
	expect(screen.queryByTestId("retained")).not.toBeInTheDocument();
	unmount();
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(
		Page({ params: Promise.resolve({ siteId: "site" }) }),
	).rejects.toThrow("Not found");
});
