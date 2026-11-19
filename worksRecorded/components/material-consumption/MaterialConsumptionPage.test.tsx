import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MaterialObservation } from "@/lib/material-consumption/model";
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
	await userEvent.selectOptions(
		screen.getByRole("combobox", { name: "Projekts" }),
		"b",
	);
	expect(
		screen.queryByRole("button", { name: "Raudas iela 16" }),
	).not.toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Šmerļa iela 3" }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("region", { name: "Projekta ziņojumi" }),
	).not.toBeInTheDocument();
	await userEvent.selectOptions(
		screen.getByRole("combobox", { name: "Projekts" }),
		"",
	);
	await userEvent.type(screen.getByLabelText("No datuma"), "2026-11-18");
	expect(
		screen.getByText("Šajā atlasē nav materiālu ziņojumu."),
	).toBeInTheDocument();
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
