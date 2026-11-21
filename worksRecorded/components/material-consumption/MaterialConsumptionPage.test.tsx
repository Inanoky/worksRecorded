import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MaterialObservation } from "@/lib/material-consumption/model";
import { getMaterialConsumption } from "@/server/actions/material-consumption";
import {
	MaterialConsumptionPage,
	materialConsumptionCsv,
} from "./MaterialConsumptionPage";

jest.mock("@/server/actions/material-consumption", () => ({
	getMaterialConsumption: jest.fn(),
}));
jest.mock("next/link", () => ({
	__esModule: true,
	default: ({ children, ...props }: React.ComponentProps<"a">) => (
		<a {...props}>{children}</a>
	),
}));
const projects = [
	{ id: "a", name: "Raudas iela 16" },
	{ id: "b", name: "Šmerļa iela 3" },
];
function observation(
	overrides: Partial<MaterialObservation> = {},
): MaterialObservation {
	return {
		id: "one",
		siteId: "a",
		sourceKey: "source1",
		date: "2026-11-17",
		material: "cement",
		kind: "consumed",
		bags: 25,
		status: "reported",
		reason: null,
		quote: "25 maisi",
		originalText: "Artis: Estrich 25 maisi",
		recordIds: ["row"],
		sourceMessageIds: ["wa1"],
		reporter: "Artis",
		location: "2. stāvs",
		photos: [],
		basis: "source",
		...overrides,
	};
}
const initialData = {
	projects,
	entries: [
		observation(),
		observation({ id: "delivery", kind: "delivered", bags: 30 }),
		observation({
			id: "two",
			siteId: "b",
			material: "thermowhite_glue",
			bags: 85,
			sourceKey: "source2",
		}),
		observation({
			id: "unknown",
			bags: null,
			status: "needs_review",
			reason: "Maisu skaits nav norādīts.",
			sourceKey: "source3",
		}),
	],
	coverage: "Pārbaudīti avoti.",
	reviewedAt: null,
	loadedAt: "2026-11-19T10:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

it("shows consumed totals, project evidence and delivery separately", async () => {
	render(<MaterialConsumptionPage initialData={initialData} />);
	const totals = within(
		screen.getByRole("region", { name: "Perioda kopsavilkums" }),
	);
	expect(totals.getByText("25")).toBeInTheDocument();
	expect(totals.getByText("85")).toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Raudas iela 16" }));
	const detail = within(
		screen.getByRole("region", { name: "Projekta ziņojumi" }),
	);
	expect(detail.getByText("25 maisi")).toBeInTheDocument();
	expect(detail.getByText("30 maisi")).toBeInTheDocument();
	expect(detail.getByText(/Maisu skaits nav norādīts/)).toBeInTheDocument();
	await userEvent.selectOptions(
		detail.getByLabelText("Ziņojumu veids"),
		"consumed",
	);
	expect(detail.queryByText("30 maisi")).not.toBeInTheDocument();
});

it("filters by project and dates and shows a useful empty state", async () => {
	render(<MaterialConsumptionPage initialData={initialData} />);
	await userEvent.click(screen.getByRole("button", { name: "Raudas iela 16" }));
	await userEvent.click(screen.getByRole("combobox", { name: "Projekts" }));
	await userEvent.click(screen.getByRole("option", { name: "Šmerļa iela 3" }));
	expect(
		screen.queryByRole("button", { name: "Raudas iela 16" }),
	).not.toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("region", { name: "Projekta ziņojumi" }),
	).not.toBeInTheDocument();
	await userEvent.click(screen.getByRole("combobox", { name: "Projekts" }));
	await userEvent.click(screen.getByRole("option", { name: "Visi projekti" }));
	await userEvent.type(screen.getByLabelText("No datuma"), "2026-11-18");
	expect(
		screen.getByText("Šajā atlasē nav materiālu ziņojumu."),
	).toBeInTheDocument();
});

it("searches project names without case or accents and preserves dates without fetching data", async () => {
	const user = userEvent.setup();
	render(<MaterialConsumptionPage initialData={initialData} />);
	await user.type(screen.getByLabelText("No datuma"), "2026-11-17");
	await user.type(screen.getByLabelText("Līdz datumam"), "2026-11-17");
	await user.click(screen.getByRole("combobox", { name: "Projekts" }));
	const search = screen.getByRole("textbox", { name: "Meklēt projektu" });
	expect(
		screen.getByRole("dialog", { name: "Projektu izvēle" }),
	).toBeInTheDocument();
	expect(search).toHaveFocus();
	await user.type(search, "SMERLA");
	expect(
		screen.getByRole("option", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("option", { name: "Raudas iela 16" }),
	).not.toBeInTheDocument();
	expect(
		screen.getByRole("option", { name: "Visi projekti" }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Raudas iela 16" }),
	).toBeInTheDocument();
	await user.keyboard("{Enter}");
	expect(
		screen.queryByRole("button", { name: "Raudas iela 16" }),
	).not.toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(screen.getByLabelText("No datuma")).toHaveValue("2026-11-17");
	expect(screen.getByLabelText("Līdz datumam")).toHaveValue("2026-11-17");
	expect(getMaterialConsumption).not.toHaveBeenCalled();
	await waitFor(() =>
		expect(screen.getByRole("combobox", { name: "Projekts" })).toHaveFocus(),
	);
});

it("navigates the project choices with arrow keys and applies only the confirmed option", async () => {
	const user = userEvent.setup();
	render(<MaterialConsumptionPage initialData={initialData} />);
	const trigger = screen.getByRole("combobox", { name: "Projekts" });
	trigger.focus();
	await user.keyboard("{ArrowDown}");
	const search = screen.getByRole("textbox", { name: "Meklēt projektu" });
	expect(search).toHaveFocus();
	await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
	expect(
		screen.getByRole("button", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(search).toHaveAttribute(
		"aria-activedescendant",
		screen.getByRole("option", { name: "Raudas iela 16" }).id,
	);
	await user.keyboard("{Enter}");
	expect(
		screen.queryByRole("button", { name: "Šmerļa iela 3" }),
	).not.toBeInTheDocument();
	expect(trigger).toHaveTextContent("Raudas iela 16");
});

it("keeps an empty search from changing the report and resets search on Escape or clearing", async () => {
	const user = userEvent.setup();
	render(<MaterialConsumptionPage initialData={initialData} />);
	const trigger = screen.getByRole("combobox", { name: "Projekts" });
	await user.click(trigger);
	await user.click(screen.getByRole("option", { name: "Šmerļa iela 3" }));
	await user.click(trigger);
	await user.type(
		screen.getByRole("textbox", { name: "Meklēt projektu" }),
		"missing project",
	);
	expect(screen.getByRole("status")).toHaveTextContent("Projekti nav atrasti.");
	expect(
		screen.getByRole("option", { name: "Visi projekti" }),
	).toBeInTheDocument();
	await user.keyboard("{Enter}");
	expect(trigger).toHaveTextContent("Šmerļa iela 3");
	expect(trigger).toHaveAttribute("aria-expanded", "true");
	await user.keyboard("{Escape}");
	expect(trigger).toHaveAttribute("aria-expanded", "false");
	expect(trigger).toHaveTextContent("Šmerļa iela 3");
	await user.click(trigger);
	const search = screen.getByRole("textbox", { name: "Meklēt projektu" });
	expect(search).toHaveValue("");
	expect(screen.getByRole("option", { name: "Šmerļa iela 3" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await user.type(search, "raudas");
	await user.click(screen.getByRole("button", { name: "Notīrīt meklēšanu" }));
	expect(search).toHaveValue("");
	expect(search).toHaveFocus();
	expect(screen.getByRole("option", { name: "Šmerļa iela 3" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await user.click(screen.getByRole("option", { name: "Visi projekti" }));
	expect(
		screen.getByRole("button", { name: "Raudas iela 16" }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(getMaterialConsumption).not.toHaveBeenCalled();
});

it("exports only project, material type, confirmed consumed bags and work date", () => {
	const csv = materialConsumptionCsv(
		[
			observation(),
			observation({
				id: "tw",
				siteId: "b",
				material: "thermowhite_glue",
				bags: 25.5,
			}),
			observation({ id: "supply", kind: "delivered", bags: 45 }),
			observation({ id: "stock", kind: "balance", bags: 30 }),
			observation({ id: "review", status: "needs_review", bags: 121 }),
			observation({ id: "missing", bags: null }),
			observation({ id: "other", material: "unknown", bags: 3 }),
		],
		projects,
	);
	expect(csv).toBe(
		'\ufeff"Projekts";"Tips";"Daudzums (maisi)";"Datums"\r\n' +
			'"Raudas iela 16";"cement";"25";"17.11.2026"\r\n' +
			'"Šmerļa iela 3";"thermowhite";"25,5";"17.11.2026"',
	);
});

it("prevents formula injection through exported project names", () => {
	const csv = materialConsumptionCsv(
		[observation()],
		[{ id: "a", name: '=HYPERLINK("bad")' }],
	);
	expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
});
