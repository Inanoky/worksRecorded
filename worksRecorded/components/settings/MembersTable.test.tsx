import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { editUserData } from "@/server/actions/settings-actions";
import { getSettingsUiMessages } from "@/lib/dashboard-i18n";
import { MembersTable, type Member } from "./MembersTable";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock("@/server/actions/settings-actions", () => ({
  editUserData: jest.fn(async () => undefined),
  deleteOrganizationUser: jest.fn(),
  inviteUserByEmail: jest.fn(),
  sendManualReminder: jest.fn(),
}));

const member: Member = {
  id: "member", email: "member@example.com", firstName: "Anna", lastName: "Test",
  phone: "37120000000", role: "site manager", status: "active",
  reminderTime: "1970-01-01T15:00:00Z", remindersEnabled: true, reminderText: "Daily reminder",
};
const t = getSettingsUiMessages("lv");

it("shows Komanda and edits only retained fields without overwriting hidden values", async () => {
  const user = userEvent.setup();
  render(<MembersTable data={[member]} pageSize={5} organizationLanguage="lv" titleVariant="team" hideRole hideStatus hideReminders />);
  expect(screen.getByText("Komanda")).toBeInTheDocument();
  for (const header of [t.roleColumn, t.statusColumn, t.reminderTimeColumn, t.remindersEnabledColumn, t.reminderTextColumn]) {
    expect(screen.queryByRole("columnheader", { name: header })).not.toBeInTheDocument();
  }
  expect(screen.getByRole("columnheader", { name: t.phoneColumn })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: t.actions }));
  expect(screen.queryByText("Send reminder now")).not.toBeInTheDocument();
  await user.click(screen.getByRole("menuitem", { name: t.edit }));
  expect(screen.queryByDisplayValue("Daily reminder")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("15:00")).not.toBeInTheDocument();
  const firstNameInput = screen.getByDisplayValue("Anna");
  await user.clear(firstNameInput);
  await user.type(firstNameInput, "Anita");
  await user.click(screen.getByRole("button", { name: t.saveChanges }));
  await waitFor(() => expect(editUserData).toHaveBeenCalledWith("member", {
    firstName: "Anita", lastName: "Test", phone: "37120000000",
  }));
});

it("keeps the default columns and reminder action for other organizations", async () => {
  const user = userEvent.setup();
  render(<MembersTable data={[member]} pageSize={5} organizationLanguage="lv" />);
  expect(screen.getByText(t.siteManagers)).toBeInTheDocument();
  for (const header of [t.roleColumn, t.statusColumn, t.reminderTimeColumn, t.remindersEnabledColumn, t.reminderTextColumn]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
  }
  await user.click(screen.getByRole("button", { name: t.actions }));
  expect(screen.getByRole("menuitem", { name: "Send reminder now" })).toBeInTheDocument();
});

it("localizes the team title in English", () => {
  render(<MembersTable data={[]} pageSize={5} organizationLanguage="en" titleVariant="team" />);
  expect(screen.getByText("Team")).toBeInTheDocument();
});
