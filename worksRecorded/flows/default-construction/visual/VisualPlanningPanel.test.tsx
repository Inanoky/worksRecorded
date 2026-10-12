import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	archiveVisualPlanningItem,
	getVisualPlanning,
	restoreVisualPlanningItem,
	saveVisualPlanningItem,
} from "./actions";
import type { VisualDrawing } from "./model";
import type { VisualPlan, VisualPlanArea } from "./planning-model";
import {
	VisualPlanningPanel,
	visualPlanningTimelineBar,
} from "./VisualPlanningPanel";

jest.mock("./actions", () => ({
	getVisualPlanning: jest.fn(),
	saveVisualPlanningItem: jest.fn(),
	archiveVisualPlanningItem: jest.fn(),
	restoreVisualPlanningItem: jest.fn(),
}));
jest.mock("./VisualPdf", () => ({
	VisualPdf: ({
		marks,
		planning,
	}: {
		marks: unknown[];
		planning?: {
			areas: VisualPlanArea[];
			backgroundAreas?: Array<VisualPlanArea & { color?: string }>;
			areaRequest?: number;
			color?: string;
			onChange: (areas: VisualPlanArea[]) => void;
		};
	}) => (
		<div data-testid="planning-pdf">
			<span>Faktiskās zonas: {marks.length}</span>
			<span>Plāna zonas: {planning?.areas.length ?? 0}</span>
			<span>Fona plāni: {planning?.backgroundAreas?.length ?? 0}</span>
			<span>
				Fona krāsas:{" "}
				{planning?.backgroundAreas?.map((area) => area.color).join(",")}
			</span>
			<span>Plāna krāsa: {planning?.color ?? "nav"}</span>
			<span>Zonas pieprasījums: {planning?.areaRequest ?? 0}</span>
			<button
				type="button"
				onClick={() =>
					planning?.onChange([
						...planning.areas,
						{
							id: `area-${planning.areas.length + 1}`,
							page: 1,
							polygon: [
								{ x: 0.1, y: 0.1 },
								{ x: 0.4, y: 0.1 },
								{ x: 0.4, y: 0.4 },
							],
						},
					])
				}
			>
				Uzzīmēt testu zonu
			</button>
		</div>
	),
}));
jest.mock("@/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
		disabled,
	}: {
		children: ReactNode;
		value: string;
		onValueChange: (value: string) => void;
		disabled?: boolean;
	}) => (
		<select
			value={value}
			disabled={disabled}
			onChange={(event) => onValueChange(event.target.value)}
		>
			{children}
		</select>
	),
	SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
	SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
}));

const area: VisualPlanArea = {
	id: "area-1",
	page: 1,
	polygon: [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
};
const plan: VisualPlan = {
	id: "11111111-1111-4111-8111-111111111111",
	version: 2,
	drawingId: "drawing",
	work: "Smilts",
	location: "1. stāvs",
	unit: "m2",
	quantity: 10,
	startDate: "2026-10-12",
	endDate: "2026-10-16",
	geometry: { version: 1, areas: [area] },
	geometryReviewRequired: false,
	archivedAt: null,
};
const indexedPlan = {
	...plan,
	progress: {
		actualIds: ["actual"],
		actualQuantity: 4,
		progressPercent: 40,
		variance: -6,
		dataIncomplete: false,
		status: "active" as const,
	},
};
const emptyIndex = {
	today: "2026-10-11",
	location: "1. stāvs",
	workOptions: [
		{ work: "Smilts", unit: "m2" },
		{ work: "XPS", unit: "m2" },
	],
	unitOptions: ["m2", "m3"],
	plans: [],
};
const drawing = {
	id: "drawing",
	name: "plan.pdf",
	createdAt: "2026-10-01",
	state: { location: "1. stāvs" },
} as VisualDrawing;
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getVisualPlanning).mockResolvedValue(emptyIndex);
	jest.mocked(saveVisualPlanningItem).mockResolvedValue({ ok: true, plan });
	jest.mocked(archiveVisualPlanningItem).mockResolvedValue({
		ok: true,
		plan: { ...plan, version: 3, archivedAt: "2026-10-11T10:00:00Z" },
	});
	jest.mocked(restoreVisualPlanningItem).mockResolvedValue({
		ok: true,
		plan: { ...plan, version: 4 },
	});
});

it("creates a visual plan from project work, dates, quantity, and drawn areas", async () => {
	const onDirtyChange = jest.fn();
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={onDirtyChange}
		/>,
	);
	await screen.findByLabelText("Plānotais apjoms");
	expect(
		screen.getByText("Šajā nākotnes periodā vēl nav saglabātu plānu.", {
			exact: false,
		}),
	).toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Faktiskās zonas: 0",
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna krāsa: #16a34a",
	);
	fireEvent.click(screen.getByRole("button", { name: "Pievienot zonu" }));
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 1",
	);
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "25" },
	});
	expect(screen.getByRole("button", { name: "Pievienot jaunu" })).toBeEnabled();
	fireEvent.click(screen.getByRole("button", { name: "Pievienot jaunu" }));
	expect(screen.getByRole("alertdialog")).toHaveTextContent(
		"Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.",
	);
	fireEvent.click(screen.getByRole("button", { name: "Turpināt pašreizējo" }));
	fireEvent.change(screen.getByLabelText("Izpildes termiņš"), {
		target: { value: "2026-10-18" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Uzzīmēt testu zonu" }));
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna zonas: 1",
	);
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt plānu" }));
	await waitFor(() =>
		expect(saveVisualPlanningItem).toHaveBeenCalledWith({
			siteId: "22222222-2222-4222-8222-222222222222",
			drawingId: "drawing",
			work: "Smilts",
			location: "1. stāvs",
			unit: "m2",
			quantity: 25,
			startDate: "2026-10-11",
			endDate: "2026-10-18",
			geometry: { version: 1, areas: [area] },
		}),
	);
	expect(await screen.findByText("Plāns saglabāts.")).toBeInTheDocument();
	expect(onDirtyChange).toHaveBeenLastCalledWith(false);
});

it("keeps the planning PDF clean and limits saved plans to the future period", async () => {
	const pastPlan = {
		...indexedPlan,
		id: "33333333-3333-4333-8333-333333333333",
		startDate: "2026-10-01",
		endDate: "2026-10-05",
	};
	const laterPlan = {
		...indexedPlan,
		id: "44444444-4444-4444-8444-444444444444",
		work: "XPS",
		startDate: "2026-10-20",
		endDate: "2026-10-22",
	};
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [pastPlan, indexedPlan, laterPlan],
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);

	expect(await screen.findByText("4 / 10 m2 · 40%")).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /XPS.*20\.10\.2026/ }),
	).not.toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Faktiskās zonas: 0",
	);
	fireEvent.click(screen.getByRole("button", { name: "Nākamais periods" }));
	expect(
		await screen.findByRole("button", { name: /XPS.*20\.10\.2026/ }),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	).not.toBeInTheDocument();
	expect(screen.getByLabelText("Sākuma datums")).toHaveValue("2026-10-18");
	expect(
		screen.getByRole("button", { name: "Iepriekšējais periods" }),
	).toBeEnabled();
});

it("shows plans chronologically with duration bars across the selected period", async () => {
	const laterPlan = {
		...indexedPlan,
		id: "55555555-5555-4555-8555-555555555555",
		work: "XPS",
		startDate: "2026-10-15",
		endDate: "2026-10-17",
	};
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [laterPlan, indexedPlan],
	});
	const { container } = render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByText("Darbu secība");
	const rows = await screen.findAllByRole("button", {
		name: /(?:Smilts|XPS).*2026/,
	});
	expect(rows[0]).toHaveTextContent("01");
	expect(rows[0]).toHaveTextContent("Smilts");
	expect(rows[1]).toHaveTextContent("02");
	expect(rows[1]).toHaveTextContent("XPS");
	expect(
		container.querySelector(`[data-plan-timeline="${laterPlan.id}"]`),
	).toHaveStyle(
		visualPlanningTimelineBar(laterPlan, {
			start: "2026-10-11",
			end: "2026-10-17",
		}),
	);
	expect(
		container.querySelector(`[data-plan-timeline="${laterPlan.id}"]`),
	).toHaveStyle({ backgroundColor: "#eab308" });
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna krāsa: #eab308",
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Fona krāsas: #16a34a",
	);
});

it("shows cumulative actual progress and saves edits with optimistic versioning", async () => {
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValueOnce({ ...emptyIndex, plans: [indexedPlan] })
		.mockResolvedValue({
			...emptyIndex,
			plans: [{ ...indexedPlan, quantity: 12, version: 3 }],
		});
	jest.mocked(saveVisualPlanningItem).mockResolvedValue({
		ok: true,
		plan: { ...plan, quantity: 12, version: 3 },
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	expect(await screen.findByText("4 / 10 m2 · 40%")).toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna zonas: 1",
	);
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "12" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	await waitFor(() =>
		expect(saveVisualPlanningItem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: plan.id,
				version: 2,
				quantity: 12,
			}),
		),
	);
});

it("archives and restores plans while keeping them available in the archive list", async () => {
	const archived = {
		...indexedPlan,
		version: 3,
		archivedAt: "2026-10-11T10:00:00Z",
	};
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValueOnce({ ...emptyIndex, plans: [indexedPlan] })
		.mockResolvedValueOnce({ ...emptyIndex, plans: [archived] })
		.mockResolvedValue({ ...emptyIndex, plans: [indexedPlan] });
	const view = render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByText("4 / 10 m2 · 40%");
	fireEvent.click(screen.getByRole("button", { name: "Arhivēt" }));
	await waitFor(() =>
		expect(archiveVisualPlanningItem).toHaveBeenCalledWith({
			siteId: "22222222-2222-4222-8222-222222222222",
			id: plan.id,
			version: 2,
		}),
	);
	fireEvent.click(screen.getByRole("switch", { name: "Arhīvs" }));
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*Arhivēts/ }));
	fireEvent.click(screen.getByRole("button", { name: "Atjaunot plānu" }));
	await waitFor(() =>
		expect(restoreVisualPlanningItem).toHaveBeenCalledWith({
			siteId: "22222222-2222-4222-8222-222222222222",
			id: plan.id,
			version: 3,
		}),
	);
	view.unmount();
});

it("links an overlapping date range to the existing plan", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [indexedPlan],
	});
	jest.mocked(saveVisualPlanningItem).mockResolvedValue({
		ok: false,
		code: "overlap",
		error: "Šis darbs jau ir ieplānots periodā, kas pārklājas.",
		conflict: plan,
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByText("4 / 10 m2 · 40%");
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "11" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	expect(
		await screen.findByText(
			"Šis darbs jau ir ieplānots periodā, kas pārklājas.",
		),
	).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Atvērt esošo plānu" }));
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(10);
});
