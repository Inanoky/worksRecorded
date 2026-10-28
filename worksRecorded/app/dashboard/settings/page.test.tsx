import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { MembersTable } from "@/components/settings/MembersTable";
import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationMaterialConfigurationTemplates } from "@/server/actions/material-configuration-template-actions";
import {
	getOrganizationWorkers,
	getWhatsappReminderLogs,
} from "@/server/actions/settings-actions";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { loadOrganizationSettings } from "./load-settings";
import { OrganizationSettingsView } from "./OrganizationSettingsView";

jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: jest.fn(async () => ({ id: "viewer" })),
}));
jest.mock("next/navigation", () => ({
	redirect: jest.fn(() => {
		throw new Error("redirect");
	}),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationIdByUserId: jest.fn(),
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/server/actions/settings-actions", () => ({
	getUserData: async () => [],
	getOrganizationWorkers: jest.fn(async () => ({ workers: [], projects: [] })),
	getWhatsappReminderLogs: jest.fn(async () => []),
}));
jest.mock("@/server/actions/material-configuration-template-actions", () => ({
	getOrganizationMaterialConfigurationTemplates: jest.fn(async () => []),
	getOrganizationMaterialConfigurationTemplateOptions: async () => ({
		materialMeasures: [],
		materialTypes: [],
	}),
}));
jest.mock("@/lib/flows/registry", () => ({
	getFlowModuleUi: jest.fn(() => ({})),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: async () => "tgem-invoice-approval",
}));
jest.mock("@/components/settings/MembersTable", () => ({
	MembersTable: jest.fn(() => <div>Members</div>),
}));
jest.mock("@/components/settings/WorkersSettingsTable", () => ({
	WorkersSettingsTable: () => <div>Workers</div>,
}));
jest.mock("@/components/settings/WhatsappReminderLogsTable", () => ({
	WhatsappReminderLogsTable: () => <div>Reminder logs</div>,
}));
jest.mock(
	"@/components/settings/MaterialConfigurationTemplatesSettings",
	() => ({ MaterialConfigurationTemplatesSettings: () => <div>BIS</div> }),
);
jest.mock("@/components/settings/OrganizationLanguageSwitcher", () => ({
	OrganizationLanguageSwitcher: () => <div>Language</div>,
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getFlowModuleUi).mockReturnValue({});
});

it("simplifies only the specified TGEM organization and skips hidden-card queries", async () => {
	jest
		.mocked(getOrganizationIdByUserId)
		.mockResolvedValue(TGEM_ORGANIZATION_ID);
	render(<OrganizationSettingsView data={await loadOrganizationSettings()} />);
	expect(screen.getByText("Members")).toBeInTheDocument();
	expect(screen.getByText("Language")).toBeInTheDocument();
	for (const title of ["BIS", "Workers", "Reminder logs"]) {
		expect(screen.queryByText(title)).not.toBeInTheDocument();
	}
	expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(
		expect.objectContaining({
			titleVariant: "team",
			hideRole: true,
			hideStatus: true,
			hideReminders: true,
			hidePhone: false,
		}),
	);
	expect(getOrganizationWorkers).not.toHaveBeenCalled();
	expect(getWhatsappReminderLogs).not.toHaveBeenCalled();
	expect(getOrganizationMaterialConfigurationTemplates).not.toHaveBeenCalled();
});

it("preserves other organizations even when they use the same flow", async () => {
	jest
		.mocked(getOrganizationIdByUserId)
		.mockResolvedValue("another-organization");
	render(<OrganizationSettingsView data={await loadOrganizationSettings()} />);
	for (const title of ["BIS", "Workers", "Reminder logs"]) {
		expect(screen.getByText(title)).toBeInTheDocument();
	}
	expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(
		expect.objectContaining({
			titleVariant: "default",
			hideRole: false,
			hideStatus: false,
			hideReminders: false,
		}),
	);
});

it("preserves existing flow settings outside TGEM", async () => {
	jest
		.mocked(getOrganizationIdByUserId)
		.mockResolvedValue("another-organization");
	jest.mocked(getFlowModuleUi).mockReturnValue({
		hideOrganizationMaterialSettings: true,
		hideMemberReminderSettings: true,
		hideMemberRoleSettings: true,
		settingsTitleVariant: "adminPanel",
	});
	render(<OrganizationSettingsView data={await loadOrganizationSettings()} />);
	expect(screen.queryByText("BIS")).not.toBeInTheDocument();
	expect(screen.queryByText("Reminder logs")).not.toBeInTheDocument();
	expect(screen.getByText("Workers")).toBeInTheDocument();
	expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(
		expect.objectContaining({ titleVariant: "adminPanel", hideStatus: false }),
	);
});

it("resolves the organization from the authenticated user rather than a client argument", async () => {
	jest.mocked(getOrganizationIdByUserId).mockResolvedValue("assigned-org");
	const data = await loadOrganizationSettings();
	expect(getOrganizationIdByUserId).toHaveBeenCalledWith("viewer");
	expect(data.orgId).toBe("assigned-org");
	expect(getOrganizationWorkers).toHaveBeenCalledWith("assigned-org");
});

it("does not read settings without an assigned organization", async () => {
	jest.mocked(getOrganizationIdByUserId).mockResolvedValue(null);
	await expect(loadOrganizationSettings()).rejects.toThrow("redirect");
	expect(redirect).toHaveBeenCalledWith("/dashboard");
	expect(getOrganizationWorkers).not.toHaveBeenCalled();
	expect(getOrganizationMaterialConfigurationTemplates).not.toHaveBeenCalled();
});

it("does not read settings when authentication fails", async () => {
	jest.mocked(requireUser).mockRejectedValueOnce(new Error("login required"));
	await expect(loadOrganizationSettings()).rejects.toThrow("login required");
	expect(getOrganizationIdByUserId).not.toHaveBeenCalled();
	expect(getOrganizationWorkers).not.toHaveBeenCalled();
});
