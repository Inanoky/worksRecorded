import { render, screen } from "@testing-library/react";
import Page from "@/app/dashboard/sites/[siteId]/dashboard/page";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import {
	getSiteBisConfig,
	getUserBisTokenByUserId,
} from "@/server/actions/BIS/service";
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
	getFlowModuleUi: (key: string) => ({
		hideBisSettings: key === "ztc-production",
	}),
}));
jest.mock("@/server/actions/BIS/service", () => ({
	getSiteBisConfig: jest.fn(),
	getUserBisTokenByUserId: jest.fn(),
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
	ClientFlowDashboard: ({ bisEnabled }: { bisEnabled: boolean }) => (
		<div data-testid="standard" data-bis-enabled={bisEnabled}>
			Standard flow
		</div>
	),
}));
jest.mock("./RetainedLimeniDiary", () => ({
	RegisterLimeniDiary: ({
		siteId,
		userId,
		organizationId,
		bisEnabled,
	}: {
		siteId: string;
		userId: string;
		organizationId: string;
		bisEnabled: boolean;
	}) => (
		<div
			data-testid="retained"
			data-bis-enabled={bisEnabled}
		>{`${siteId}:${userId}:${organizationId}`}</div>
	),
	ClearRetainedDiary: () => <div>Clear retained diary</div>,
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getSiteBisConfig).mockResolvedValue(null);
	jest.mocked(getUserBisTokenByUserId).mockResolvedValue(null);
	jest.mocked(orgCheck).mockResolvedValue({
		name: "Project",
		organizationId: LIMENI_ORGANIZATION_ID,
	} as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
});

it.each([LIMENI_ORGANIZATION_ID, "other"])(
	"renders the diary with a localized outage notice for organization %s",
	async (organizationId) => {
		jest
			.mocked(orgCheck)
			.mockResolvedValue({ name: "Project", organizationId } as never);
		jest
			.mocked(getSiteBisConfig)
			.mockResolvedValue({ bisCaseId: "case" } as never);
		jest.mocked(getUserBisTokenByUserId).mockRejectedValue(
			Object.assign(new Error("BIS returned HTML"), {
				code: "BIS_REFRESH_NON_JSON",
			}),
		);
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		try {
			render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
			expect(screen.getByRole("status")).toHaveTextContent(
				"BIS īslaicīgi nav pieejams",
			);
			expect(
				screen.getByTestId(
					organizationId === LIMENI_ORGANIZATION_ID ? "retained" : "standard",
				),
			).toHaveAttribute("data-bis-enabled", "false");
		} finally {
			warn.mockRestore();
		}
	},
);

it("skips token renewal for unlinked projects", async () => {
	render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("does not touch BIS for ZTC", async () => {
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("ztc-production");
	render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
	expect(getSiteBisConfig).not.toHaveBeenCalled();
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
	expect(screen.getByTestId("standard")).toHaveAttribute(
		"data-bis-enabled",
		"false",
	);
});

it("redirects TGEM before attempting any BIS request", async () => {
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("tgem-invoice-approval");
	await expect(
		Page({ params: Promise.resolve({ siteId: "site" }) }),
	).rejects.toThrow("Redirect");
	expect(getSiteBisConfig).not.toHaveBeenCalled();
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
});

it("enables BIS only after a linked project's token is verified", async () => {
	jest
		.mocked(getSiteBisConfig)
		.mockResolvedValue({ bisCaseId: "case" } as never);
	jest.mocked(getUserBisTokenByUserId).mockResolvedValue({
		accessToken: "secret",
		refreshToken: "secret",
	} as never);
	render(await Page({ params: Promise.resolve({ siteId: "site" }) }));
	expect(screen.getByTestId("retained")).toHaveAttribute(
		"data-bis-enabled",
		"true",
	);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	expect(document.body.textContent).not.toContain("secret");
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
