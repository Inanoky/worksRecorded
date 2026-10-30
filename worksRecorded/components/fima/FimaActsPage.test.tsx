import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import {
	actChoices,
	allocateFimaActNumbers,
	type FimaActSite,
	type FimaActsData,
	makeFimaActRows,
	readFimaActRegister,
	readTrackedFimaActs,
} from "@/lib/fima/act-register";
import {
	getFimaActReferenceDetail,
	saveFimaActSettings,
} from "@/server/actions/fima-acts";
import { FimaActsPage } from "./FimaActsPage";

jest.mock("@/server/actions/fima-acts", () => ({
	getFimaActsForSite: jest.fn(),
	saveFimaActSettings: jest.fn(),
	getFimaActReferenceDetail: jest.fn(),
}));
jest.mock("@/components/sitediary/FimaActsRefreshButton", () => ({
	FimaActsRefreshButton: () => null,
}));
const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
const sourceId = "6e037a84-2c23-47a8-b49c-94993bd3cf0e";
const collection = "other_acceptance_acts";
let data: FimaActsData;
beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
	const site: FimaActSite = {
		id: siteId,
		name: "Olaine",
		bisCaseId: "668714",
		config: {
			otherSettings: {
				fimaBisActCoverage: {
					version: 1,
					caseId: "668714",
					fetchedAt: "2026-10-30T08:00:00Z",
					acts: Array.from({ length: 51 }, (_, i) => ({
						id: String(100 + i),
						collection,
						number: `KT-${100 + i}`,
						date: "2026-10-29",
						status: i === 50 ? "draft" : "approved",
						works: i === 50 ? [] : [{ id: "400", quantity: 2 }],
						plannedWorks: i === 50 ? [{ id: "401", quantity: 204 }] : [],
					})),
				},
			},
		},
	};
	const acts = readTrackedFimaActs(site);
	const choices = actChoices(site, acts);
	choices.push({
		siteId: sourceId,
		caseId: "668708",
		siteName: "Torņakalns–Olaine",
		collection,
		id: "200",
		number: "KT-SOURCE-21",
		date: "2026-09-15",
		status: "approving",
		title: "Konsoļu montāža",
		url: "https://bis.gov.lv/bisp/lv/portal/logbooks/other_acceptance_acts/200/edit",
	});
	data = {
		siteId,
		siteName: site.name,
		caseId: "668714",
		checkedAt: "2026-10-30T08:00:00Z",
		rows: makeFimaActRows(
			siteId,
			acts,
			allocateFimaActNumbers(
				readFimaActRegister(null),
				acts.map((act) => act.key),
			),
			choices,
		),
		choices,
	};
});
afterEach(() => jest.restoreAllMocks());
it("filters the entire register and restores the previous page when filters are cleared", () => {
	render(<FimaActsPage initial={data} />);
	fireEvent.click(screen.getAllByRole("button", { name: "Lapa 2" })[0]);
	const before = screen
		.getAllByRole("article")
		.map((row) => row.getAttribute("aria-label"));
	fireEvent.change(
		screen.getByRole("textbox", { name: "Meklēt visos aktos" }),
		{ target: { value: "KT-150" } },
	);
	expect(screen.getAllByRole("article")).toHaveLength(1);
	expect(screen.getByRole("article")).toHaveTextContent("KT-150");
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt filtrus" }));
	expect(
		screen.getAllByRole("article").map((row) => row.getAttribute("aria-label")),
	).toEqual(before);
});
it("keeps row text selectable and shows planned coverage separately from native inclusion", () => {
	render(<FimaActsPage initial={data} />);
	fireEvent.click(screen.getByText("KT-150"));
	expect(
		screen.queryByRole("region", { name: /detaļas/ }),
	).not.toBeInTheDocument();
	const row = screen.getByRole("article", { name: "FIMA-AKT-000051" });
	expect(row).toHaveTextContent("0 iekļauti BIS aktā");
	expect(row).toHaveTextContent("1 tikai plānoti");
	fireEvent.click(within(row).getByRole("button", { name: "Atvērt" }));
	const details = screen.getByRole("region", {
		name: "Akta FIMA-AKT-000051 detaļas",
	});
	expect(details).toHaveTextContent("Vēl nav iekļauts BIS aktā");
	expect(details).toHaveTextContent("Plānots: 204");
	expect(
		within(details).getByRole("link", { name: "BIS 401" }),
	).toHaveAttribute("href", expect.stringContaining("performed_works/401/"));
});
it("saves only an explicitly chosen approved or approving source Act and compares its works", async () => {
	const target = data.rows[0];
	jest.mocked(saveFimaActSettings).mockImplementation(async (input) => ({
		...target.setting,
		revision: 1,
		examples: input.kind === "examples" ? input.examples : [],
		history: [],
	}));
	jest.mocked(getFimaActReferenceDetail).mockResolvedValue({
		...data.rows[1],
		siteId: sourceId,
		number: "KT-SOURCE-21",
	});
	render(<FimaActsPage initial={data} />);
	fireEvent.click(
		screen.getByRole("button", {
			name: `Izvēlēties paraugu ${target.localNumber}`,
		}),
	);
	const dialog = screen.getByRole("dialog");
	fireEvent.change(
		within(dialog).getByRole("textbox", { name: "Meklēt parauga aktu" }),
		{ target: { value: "KT-SOURCE-21" } },
	);
	fireEvent.click(within(dialog).getByRole("checkbox"));
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Saglabāt paraugus" }),
	);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	expect(saveFimaActSettings).toHaveBeenCalledWith(
		expect.objectContaining({
			kind: "examples",
			siteId,
			expectedRevision: 0,
			examples: [{ siteId: sourceId, caseId: "668708", collection, id: "200" }],
		}),
	);
	const row = screen.getByRole("article", { name: target.localNumber });
	expect(row).toHaveTextContent("KT-SOURCE-21");
	fireEvent.click(
		within(row).getByRole("button", { name: "Salīdzināt ar paraugu" }),
	);
	await waitFor(() => expect(getFimaActReferenceDetail).toHaveBeenCalled());
	expect(
		await screen.findByRole("heading", { name: "Parauga akts" }),
	).toBeInTheDocument();
});
it("saves a human Act comment separately and filters by BIS status and example presence", async () => {
	const target = data.rows[0];
	jest.mocked(saveFimaActSettings).mockResolvedValue({
		...target.setting,
		revision: 1,
		history: [
			{
				id: "event",
				requestId: "req",
				actorId: "person",
				actorName: "Ieva",
				at: "2026-10-30T09:00:00Z",
				kind: "comment",
				text: "Pārbaudīt rasējumu",
			},
		],
	});
	render(<FimaActsPage initial={data} />);
	fireEvent.change(screen.getByRole("combobox", { name: "BIS statuss" }), {
		target: { value: "draft" },
	});
	expect(screen.getAllByRole("article")).toHaveLength(1);
	fireEvent.change(screen.getByRole("combobox", { name: "Paraugs" }), {
		target: { value: "with" },
	});
	expect(screen.queryByRole("article")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt filtrus" }));
	fireEvent.click(
		screen.getByRole("button", { name: `Komentāri ${target.localNumber}` }),
	);
	fireEvent.change(screen.getByRole("textbox", { name: "Jauns komentārs" }), {
		target: { value: "Pārbaudīt rasējumu" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Pievienot komentāru" }));
	expect(await screen.findByText("Pārbaudīt rasējumu")).toBeInTheDocument();
	expect(saveFimaActSettings).toHaveBeenCalledWith(
		expect.objectContaining({
			kind: "comment",
			text: "Pārbaudīt rasējumu",
			id: target.id,
		}),
	);
});
