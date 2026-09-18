import { render, screen } from "@testing-library/react";
import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { getOrganizationWorkers, getWhatsappReminderLogs } from "@/server/actions/settings-actions";
import { getOrganizationMaterialConfigurationTemplates } from "@/server/actions/material-configuration-template-actions";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { MembersTable } from "@/components/settings/MembersTable";
import SettingsSiteRoute from "./page";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: async () => ({ id: "viewer" }) }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
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
  getOrganizationMaterialConfigurationTemplateOptions: async () => ({ materialMeasures: [], materialTypes: [] }),
}));
jest.mock("@/lib/flows/registry", () => ({ getFlowModuleUi: jest.fn(() => ({})) }));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({ resolveFlowModuleKeyForRuntime: async () => "tgem-invoice-approval" }));
jest.mock("@/components/settings/MembersTable", () => ({ MembersTable: jest.fn(() => <div>Members</div>) }));
jest.mock("@/components/settings/WorkersSettingsTable", () => ({ WorkersSettingsTable: () => <div>Workers</div> }));
jest.mock("@/components/settings/WhatsappReminderLogsTable", () => ({ WhatsappReminderLogsTable: () => <div>Reminder logs</div> }));
jest.mock("@/components/settings/MaterialConfigurationTemplatesSettings", () => ({ MaterialConfigurationTemplatesSettings: () => <div>BIS</div> }));
jest.mock("@/components/settings/OrganizationLanguageSwitcher", () => ({ OrganizationLanguageSwitcher: () => <div>Language</div> }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getFlowModuleUi).mockReturnValue({});
});

it("simplifies only the specified TGEM organization and skips hidden-card queries", async () => {
  jest.mocked(getOrganizationIdByUserId).mockResolvedValue(TGEM_ORGANIZATION_ID);
  render(await SettingsSiteRoute());
  expect(screen.getByText("Members")).toBeInTheDocument();
  expect(screen.getByText("Language")).toBeInTheDocument();
  for (const title of ["BIS", "Workers", "Reminder logs"]) {
    expect(screen.queryByText(title)).not.toBeInTheDocument();
  }
  expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(expect.objectContaining({
    titleVariant: "team", hideRole: true, hideStatus: true, hideReminders: true, hidePhone: false,
  }));
  expect(getOrganizationWorkers).not.toHaveBeenCalled();
  expect(getWhatsappReminderLogs).not.toHaveBeenCalled();
  expect(getOrganizationMaterialConfigurationTemplates).not.toHaveBeenCalled();
});

it("preserves other organizations even when they use the same flow", async () => {
  jest.mocked(getOrganizationIdByUserId).mockResolvedValue("another-organization");
  render(await SettingsSiteRoute());
  for (const title of ["BIS", "Workers", "Reminder logs"]) {
    expect(screen.getByText(title)).toBeInTheDocument();
  }
  expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(expect.objectContaining({
    titleVariant: "default", hideRole: false, hideStatus: false, hideReminders: false,
  }));
});

it("preserves existing flow settings outside TGEM", async () => {
  jest.mocked(getOrganizationIdByUserId).mockResolvedValue("another-organization");
  jest.mocked(getFlowModuleUi).mockReturnValue({ hideOrganizationMaterialSettings: true, hideMemberReminderSettings: true, hideMemberRoleSettings: true, settingsTitleVariant: "adminPanel" });
  render(await SettingsSiteRoute());
  expect(screen.queryByText("BIS")).not.toBeInTheDocument();
  expect(screen.queryByText("Reminder logs")).not.toBeInTheDocument();
  expect(screen.getByText("Workers")).toBeInTheDocument();
  expect(jest.mocked(MembersTable).mock.calls[0][0]).toEqual(expect.objectContaining({ titleVariant: "adminPanel", hideStatus: false }));
});
