import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	archiveVisualPlanningContactItem,
	restoreVisualPlanningContactItem,
	saveVisualPlanningContact,
} from "@/flows/default-construction/visual/actions";
import { VisualPlanningContactsCard } from "./VisualPlanningContactsCard";

jest.mock("@/flows/default-construction/visual/actions", () => ({
	saveVisualPlanningContact: jest.fn(),
	archiveVisualPlanningContactItem: jest.fn(),
	restoreVisualPlanningContactItem: jest.fn(),
}));
jest.mock("sonner", () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const siteId = "33333333-3333-4333-8333-333333333333";
const contact = {
	id: "11111111-1111-4111-8111-111111111111",
	name: "Anna Bērziņa",
	phone: "37120000000",
	archivedAt: null,
};

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(saveVisualPlanningContact).mockResolvedValue({
		ok: true,
		contact,
	});
	jest.mocked(archiveVisualPlanningContactItem).mockResolvedValue({
		ok: true,
		contact: { ...contact, archivedAt: "2026-10-13T10:00:00.000Z" },
	});
	jest.mocked(restoreVisualPlanningContactItem).mockResolvedValue({
		ok: true,
		contact,
	});
});

it("saves and displays a project planning contact", async () => {
	render(
		<VisualPlanningContactsCard
			siteId={siteId}
			initialContacts={[]}
			organizationLanguage="lv"
		/>,
	);

	expect(screen.getByText("Kontakti vēl nav pievienoti.")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Pievienot kontaktu" }));
	fireEvent.change(screen.getByLabelText("Vārds, uzvārds"), {
		target: { value: "Anna Bērziņa" },
	});
	fireEvent.change(screen.getByLabelText("Mobilais tālrunis"), {
		target: { value: "20000000" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));

	await waitFor(() =>
		expect(saveVisualPlanningContact).toHaveBeenCalledWith({
			siteId,
			name: "Anna Bērziņa",
			phone: "37120000000",
		}),
	);
	expect(await screen.findByText("Anna Bērziņa")).toBeInTheDocument();
	expect(screen.getByText("+37120000000")).toBeInTheDocument();
});

it("archives a contact without removing it from the archived view", async () => {
	jest.spyOn(window, "confirm").mockReturnValue(true);
	render(
		<VisualPlanningContactsCard
			siteId={siteId}
			initialContacts={[contact]}
			organizationLanguage="lv"
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Arhivēt" }));
	await waitFor(() =>
		expect(archiveVisualPlanningContactItem).toHaveBeenCalledWith({
			siteId,
			id: contact.id,
		}),
	);
	expect(screen.queryByText("Anna Bērziņa")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("switch", { name: "Rādīt arhivētos" }));
	expect(screen.getByText("Anna Bērziņa")).toBeInTheDocument();
	expect(screen.getByText("Arhivēts")).toBeInTheDocument();
});
