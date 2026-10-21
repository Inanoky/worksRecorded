import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { type ReactNode, useEffect } from "react";
import {
	addVisualSection,
	archiveVisualPlanningItem,
	getVisualPlanning,
	restoreVisualPlanningItem,
	saveVisualPlanningItem,
} from "./actions";
import type { VisualDrawing } from "./model";
import { renderPlanningImages } from "./planning-image";
import type { VisualPlan, VisualPlanArea } from "./planning-model";
import { sendPlanningWhatsAppTask } from "./planning-whatsapp-send-client";
import { fetchSectionDrawing } from "./section-drawing-client";
import {
	cumulativeVisualPlanningPlans,
	VisualPlanningPanel,
	visualPlanningTimelineBar,
	visualPlanningTimelineRange,
} from "./VisualPlanningPanel";
import { VisualPlanningWhatsApp } from "./VisualPlanningWhatsApp";
import { VisualClientCache } from "./visual-client-cache";

jest.mock("./actions", () => ({
	addVisualSection: jest.fn(),
	getVisualPlanning: jest.fn(),
	saveVisualPlanningItem: jest.fn(),
	archiveVisualPlanningItem: jest.fn(),
	restoreVisualPlanningItem: jest.fn(),
}));
jest.mock("./planning-whatsapp-send-client", () => ({
	sendPlanningWhatsAppTask: jest.fn(),
}));
jest.mock("./VisualPdf", () => ({
	VisualPdf: ({
		marks,
		planning,
		controlsHost,
		onDocumentChange,
	}: {
		marks: unknown[];
		controlsHost?: HTMLElement | null;
		onDocumentChange?: (document: PDFDocumentProxy | null) => void;
		planning?: {
			planId: string | null;
			areas: VisualPlanArea[];
			backgroundAreas?: Array<
				VisualPlanArea & { planId: string; color?: string }
			>;
			areaRequest?: number;
			color?: string;
			onChange: (areas: VisualPlanArea[]) => void;
			onEditingChange?: (editing: boolean) => void;
			onSelectArea: (
				selection: { planId: string | null; areaId: string } | null,
			) => void;
		};
	}) => {
		useEffect(() => {
			onDocumentChange?.({} as PDFDocumentProxy);
			return () => onDocumentChange?.(null);
		}, [onDocumentChange]);
		return (
			<div data-testid="planning-pdf" data-controls-docked={!!controlsHost}>
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
				<button type="button" onClick={() => planning?.onEditingChange?.(true)}>
					Sākt zonas rediģēšanu
				</button>
				<button
					type="button"
					onClick={() => planning?.onEditingChange?.(false)}
				>
					Beigt zonas rediģēšanu
				</button>
				<button
					type="button"
					disabled={!planning?.backgroundAreas?.length}
					onClick={() => {
						const background = planning?.backgroundAreas?.[0];
						if (background)
							planning.onSelectArea({
								planId: background.planId,
								areaId: background.id,
							});
					}}
				>
					Izvēlēties fona zonu
				</button>
			</div>
		);
	},
}));
jest.mock("./planning-image", () => ({ renderPlanningImages: jest.fn() }));
jest.mock("./section-drawing-client", () => ({
	fetchSectionDrawing: jest.fn(),
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
	contactId: null,
	geometry: { version: 1, areas: [area] },
	geometryReviewRequired: false,
	archivedAt: null,
};
const indexedPlan = {
	...plan,
	whatsAppSends: [],
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
	contacts: [],
	plans: [],
};
const drawing = {
	id: "drawing",
	name: "plan.pdf",
	createdAt: "2026-10-01",
	state: { location: "1. stāvs" },
} as VisualDrawing;
const planningContact = {
	id: "66666666-6666-4666-8666-666666666666",
	name: "Anna Bērziņa",
	phone: "37120000000",
	archivedAt: null,
};
function sidebarAddZone() {
	return within(
		screen.getByRole("complementary", { name: "Darbu plānošana" }),
	).getByRole("button", { name: "Pievienot zonu" });
}
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(fetchSectionDrawing).mockResolvedValue({
		page: 11,
		section: "PA1.6",
		blob: new Blob(["section"], { type: "image/png" }),
	});
	jest.mocked(sendPlanningWhatsAppTask).mockResolvedValue({
		sendId: "send-1",
		status: "sent",
		items: [
			{
				ordinal: 0,
				page: 1,
				section: null,
				status: "sent",
				metaMessageId: "wamid.1",
				error: null,
			},
		],
	});
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: jest.fn(() => "blob:zone-preview"),
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: jest.fn(),
	});
	jest
		.mocked(renderPlanningImages)
		.mockResolvedValue([
			{ page: 1, blob: new Blob(["zone"], { type: "image/png" }) },
		]);
	jest.mocked(getVisualPlanning).mockResolvedValue(emptyIndex);
	jest.mocked(saveVisualPlanningItem).mockImplementation(async (raw) => {
		const input = raw as typeof plan & { clientId?: string };
		return {
			ok: true,
			plan: {
				...plan,
				...input,
				id: input.id ?? input.clientId ?? plan.id,
				version: input.id ? input.version + 1 : 1,
				progress: indexedPlan.progress,
			},
		};
	});
	jest.mocked(archiveVisualPlanningItem).mockResolvedValue({
		ok: true,
		plan: { ...plan, version: 3, archivedAt: "2026-10-11T10:00:00Z" },
	});
	jest.mocked(restoreVisualPlanningItem).mockResolvedValue({
		ok: true,
		plan: { ...plan, version: 4 },
	});
});

afterEach(() => {
	jest.useRealTimers();
});

it("adds project sections from the dropdown and saves the selected section without changing geometry", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		sections: ["A"],
		plans: [indexedPlan],
	});
	jest.mocked(addVisualSection).mockResolvedValue(["A", "Kāpņu telpa"]);
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	const select = screen
		.getByRole("option", { name: "Pārvaldīt opcijas" })
		.closest("select");
	if (!select) throw new Error("Section select missing");
	fireEvent.change(select, { target: { value: "manage" } });
	const dialog = screen.getByRole("dialog", { name: "Pārvaldīt sekcijas" });
	fireEvent.change(within(dialog).getByLabelText("Jauna sekcija"), {
		target: { value: "Kāpņu telpa" },
	});
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Pievienot sekciju" }),
	);
	await waitFor(() =>
		expect(addVisualSection).toHaveBeenCalledWith("site", "Kāpņu telpa"),
	);
	await within(dialog).findByText("Kāpņu telpa");
	fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
	fireEvent.change(select, { target: { value: "section:Kāpņu telpa" } });
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	await waitFor(() =>
		expect(saveVisualPlanningItem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: plan.id,
				work: plan.work,
				quantity: plan.quantity,
				geometry: { ...plan.geometry, section: "Kāpņu telpa" },
			}),
		),
	);
});

it("reports a dedicated-number send failure and allows an explicit retry", async () => {
	jest
		.mocked(sendPlanningWhatsAppTask)
		.mockRejectedValueOnce(new Error("Meta failed"));
	render(
		<VisualPlanningWhatsApp
			siteId="site"
			plan={plan}
			contact={{ name: "Anna", phone: "37120000000" }}
			disabled={false}
			createImages={async () => [
				{ page: 1, blob: new Blob(["zone"], { type: "image/png" }) },
			]}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	const send = await screen.findByRole("button", {
		name: "Nosūtīt no Limeni WhatsApp",
	});
	fireEvent.click(send);
	expect(await screen.findByRole("alert")).toHaveTextContent("Meta failed");
	fireEvent.click(send);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	expect(sendPlanningWhatsAppTask).toHaveBeenCalledTimes(2);
});

it("builds empty and single-day planning timeline ranges", () => {
	expect(visualPlanningTimelineRange([])).toEqual({
		firstDay: null,
		lastDay: null,
	});
	const single = { startDate: "2026-10-12", endDate: "2026-10-12" };
	const expectedDay = Date.parse("2026-10-12T00:00:00Z") / 86_400_000;
	expect(visualPlanningTimelineRange([single])).toEqual({
		firstDay: expectedDay,
		lastDay: expectedDay,
	});
	expect(cumulativeVisualPlanningPlans([single], expectedDay - 1)).toEqual([]);
	expect(cumulativeVisualPlanningPlans([single], expectedDay)).toEqual([
		single,
	]);
});

it("docks drawing controls above the map and both planning panels", async () => {
	const { container } = render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await waitFor(() =>
		expect(screen.getByTestId("planning-pdf")).toHaveAttribute(
			"data-controls-docked",
			"true",
		),
	);
	const host = container.querySelector("[data-planning-controls]");
	const map = screen.getByTestId("planning-pdf").parentElement;
	expect(host?.nextElementSibling).toBe(map);
	expect(host).not.toHaveClass("absolute");
	expect(map).toContainElement(
		screen.getByRole("complementary", { name: "Darbu plānošana" }),
	);
	await waitFor(() => expect(sidebarAddZone()).toBeEnabled());
	fireEvent.click(sidebarAddZone());
	expect(map).toContainElement(
		screen.getByRole("complementary", { name: "Plāna detaļas" }),
	);
	expect(screen.getByTestId("planning-pdf")).toHaveAttribute(
		"data-controls-docked",
		"true",
	);
});

it("disables the planning slider for a single-day range", async () => {
	const singleDayPlan = {
		...indexedPlan,
		startDate: "2026-10-12",
		endDate: "2026-10-12",
	};
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [singleDayPlan],
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);

	const slider = await screen.findByRole("slider", {
		name: "Plānošanas datums",
	});
	expect(slider).toBeDisabled();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent("Fona plāni: 1");
});

it("reuses cached planning data and pauses stale refresh while the draft is dirty", async () => {
	let now = 1_000;
	const cache = new VisualClientCache(
		"22222222-2222-4222-8222-222222222222",
		() => now,
	);
	cache.rememberPlanning("drawing", {
		...emptyIndex,
		plans: [indexedPlan],
	});
	const view = render(
		<VisualPlanningPanel
			resourceCache={cache}
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ });
	expect(screen.queryByText("4 / 10 m2 · 40%")).not.toBeInTheDocument();
	expect(getVisualPlanning).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "12" },
	});
	now += 60_000;
	await act(async () => {
		window.dispatchEvent(new Event("focus"));
		await Promise.resolve();
	});
	expect(getVisualPlanning).not.toHaveBeenCalled();
	view.unmount();
	cache.clear();
});

it("opens saved areas in the right drawer and guards closing dirty changes", async () => {
	const laterPlan = {
		...indexedPlan,
		id: "55555555-5555-4555-8555-555555555555",
		work: "XPS",
		startDate: "2026-10-15",
		endDate: "2026-10-17",
	};
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [indexedPlan, laterPlan],
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ });
	expect(screen.queryByText("4 / 10 m2 · 40%")).not.toBeInTheDocument();
	const list = screen.getByRole("complementary", { name: "Darbu plānošana" });
	expect(
		within(list).queryByLabelText("Plānotais apjoms"),
	).not.toBeInTheDocument();
	expect(screen.queryByText(/Zonas var pārvietot/)).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Izvēlēties fona zonu" }));
	const drawer = screen.getByRole("complementary", { name: "Plāna detaļas" });
	expect(drawer).toHaveAttribute("data-state", "open");
	expect(
		within(drawer).getByRole("button", { name: "Aizvērt plāna detaļas" }),
	).toHaveFocus();
	expect(within(drawer).getByLabelText("Plānotais apjoms")).toHaveValue(10);
	fireEvent.change(within(drawer).getByLabelText("Plānotais apjoms"), {
		target: { value: "12" },
	});
	fireEvent.click(screen.getByRole("button", { name: /XPS.*15\.10\.2026/ }));
	expect(screen.getByRole("alertdialog")).toHaveTextContent(
		"Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.",
	);
	fireEvent.click(screen.getByRole("button", { name: "Turpināt pašreizējo" }));
	fireEvent.click(
		within(drawer).getByRole("button", { name: "Aizvērt plāna detaļas" }),
	);
	expect(screen.getByRole("alertdialog")).toHaveTextContent(
		"Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.",
	);
	fireEvent.click(screen.getByRole("button", { name: "Turpināt pašreizējo" }));
	fireEvent.keyDown(within(drawer).getByLabelText("Plānotais apjoms"), {
		key: "Escape",
	});
	expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Atmest un turpināt" }));
	expect(
		document.querySelector('[aria-label="Plāna detaļas"]'),
	).toHaveAttribute("data-state", "closed");
});

it("truncates long work names outside the work dropdown", async () => {
	const longWork =
		"Grīdas siltumizolācijas un hidroizolācijas sagatavošanas darbi";
	const longPlan = { ...indexedPlan, work: longWork };
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		workOptions: [...emptyIndex.workOptions, { work: longWork, unit: "m2" }],
		plans: [longPlan],
	});
	const { container } = render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);

	const savedName = await screen.findByText(longWork);
	expect(savedName).toHaveAttribute("data-plan-work-name", "saved");
	expect(savedName).toHaveClass("min-w-0", "flex-1", "truncate");
	fireEvent.click(savedName.closest("button") as HTMLButtonElement);

	const detailName = container.querySelector('[data-plan-work-name="detail"]');
	expect(detailName).toHaveTextContent(longWork);
	expect(detailName).toHaveClass("min-w-0", "flex-1", "truncate");
	expect(screen.getByRole("option", { name: longWork })).toHaveTextContent(
		longWork,
	);
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(10);
});

it("guards the planning drawer while a zone geometry edit is active", async () => {
	const onDirtyChange = jest.fn();
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [indexedPlan],
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={onDirtyChange}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	const drawer = screen.getByRole("complementary", { name: "Plāna detaļas" });
	fireEvent.click(
		screen.getByRole("button", { name: "Sākt zonas rediģēšanu" }),
	);
	expect(onDirtyChange).toHaveBeenLastCalledWith(true);
	expect(sidebarAddZone()).toBeDisabled();
	expect(
		within(drawer).queryByRole("button", { name: "Pievienot zonu" }),
	).not.toBeInTheDocument();
	fireEvent.click(
		within(drawer).getByRole("button", { name: "Aizvērt plāna detaļas" }),
	);
	expect(screen.getByRole("alertdialog")).toHaveTextContent(
		"Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.",
	);
	fireEvent.click(screen.getByRole("button", { name: "Turpināt pašreizējo" }));
	fireEvent.click(
		screen.getByRole("button", { name: "Beigt zonas rediģēšanu" }),
	);
	expect(onDirtyChange).toHaveBeenLastCalledWith(false);
	expect(sidebarAddZone()).toBeEnabled();
	expect(
		within(drawer).getByRole("button", { name: "Pievienot zonu" }),
	).toBeEnabled();
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
	await screen.findByText("Šai lokācijai vēl nav saglabātu plānu.", {
		exact: false,
	});
	expect(screen.queryByRole("slider")).not.toBeInTheDocument();
	await waitFor(() => expect(sidebarAddZone()).toBeEnabled());
	fireEvent.click(sidebarAddZone());
	await screen.findByLabelText("Plānotais apjoms");
	expect(
		screen.queryByRole("button", { name: "Pievienot jaunu" }),
	).not.toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 1",
	);
	expect(
		screen.getByText("Šai lokācijai vēl nav saglabātu plānu.", {
			exact: false,
		}),
	).toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Faktiskās zonas: 0",
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna krāsa: #16a34a",
	);
	fireEvent.click(
		within(
			screen.getByRole("complementary", { name: "Plāna detaļas" }),
		).getByRole("button", { name: "Pievienot zonu" }),
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 2",
	);
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "25" },
	});
	expect(sidebarAddZone()).toBeEnabled();
	fireEvent.click(sidebarAddZone());
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(25);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 3",
	);
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
			clientId: expect.any(String),
			mutationId: expect.any(String),
			siteId: "22222222-2222-4222-8222-222222222222",
			drawingId: "drawing",
			work: "Smilts",
			location: "1. stāvs",
			unit: "m2",
			quantity: 25,
			startDate: "2026-10-11",
			endDate: "2026-10-18",
			contactId: null,
			geometry: { version: 1, areas: [area] },
		}),
	);
	expect(await screen.findByText("Plāns saglabāts.")).toBeInTheDocument();
	expect(onDirtyChange).toHaveBeenLastCalledWith(false);
});

it("uses the same add-zone action in both panels without replacing a saved plan or dirty fields", async () => {
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValue({ ...emptyIndex, plans: [indexedPlan] });
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	const drawer = screen.getByRole("complementary", { name: "Plāna detaļas" });
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "99" },
	});
	fireEvent.change(screen.getByLabelText("Izpildes termiņš"), {
		target: { value: "2026-10-18" },
	});
	fireEvent.click(sidebarAddZone());
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 1",
	);
	fireEvent.click(
		within(drawer).getByRole("button", { name: "Pievienot zonu" }),
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Zonas pieprasījums: 2",
	);
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna zonas: 1",
	);
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(99);
	expect(screen.getByLabelText("Izpildes termiņš")).toHaveValue("2026-10-18");
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	await waitFor(() =>
		expect(saveVisualPlanningItem).toHaveBeenCalledWith(
			expect.objectContaining({
				id: plan.id,
				quantity: 99,
				geometry: plan.geometry,
			}),
		),
	);
});

it("disables both add-zone buttons at the polygon limit", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [
			{
				...indexedPlan,
				geometry: {
					version: 1,
					areas: Array.from({ length: 50 }, (_, i) => ({
						...area,
						id: `area-${i}`,
					})),
				},
			},
		],
	});
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	expect(sidebarAddZone()).toBeDisabled();
	expect(
		within(
			screen.getByRole("complementary", { name: "Plāna detaļas" }),
		).getByRole("button", { name: "Pievienot zonu" }),
	).toBeDisabled();
});

it("assigns a saved project contact to a planned job", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		contacts: [planningContact],
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);

	await waitFor(() => expect(sidebarAddZone()).toBeEnabled());
	fireEvent.click(sidebarAddZone());
	const contactOption = await screen.findByRole("option", {
		name: "Anna Bērziņa · +37120000000",
	});
	const contactSelect = contactOption.closest("select");
	expect(contactSelect).not.toBeNull();
	fireEvent.change(contactSelect as HTMLSelectElement, {
		target: { value: planningContact.id },
	});
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "25" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Uzzīmēt testu zonu" }));
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt plānu" }));

	await waitFor(() =>
		expect(saveVisualPlanningItem).toHaveBeenCalledWith(
			expect.objectContaining({ contactId: planningContact.id }),
		),
	);
});

it("prepares the saved task for its contact and allows editing the WhatsApp draft", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		contacts: [planningContact],
		plans: [
			{ ...indexedPlan, quantity: 10.123456, contactId: planningContact.id },
		],
	});
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	const dialog = screen.getByRole("dialog", {
		name: "Sagatavot uzdevumu WhatsApp",
	});
	const phone = within(dialog).getByLabelText("Saņēmēja numurs ar valsts kodu");
	const message = within(dialog).getByLabelText("Uzdevuma ziņa");
	expect(phone).toHaveValue(planningContact.phone);
	await within(dialog).findByRole("button", {
		name: "Nosūtīt no Limeni WhatsApp",
	});
	expect((message as HTMLTextAreaElement).value).toContain(
		"*Darbs:* Smilts\n*Lokācija:* 1. stāvs",
	);
	expect((message as HTMLTextAreaElement).value).toContain(
		"*Plānotais apjoms:* 10,123456 m2",
	);
	expect((message as HTMLTextAreaElement).value).toContain("12.10.2026.");
	expect((message as HTMLTextAreaElement).value).toContain("16.10.2026.");
	expect(
		await within(dialog).findByRole("img", {
			name: "Uzdevuma zona · PDF lapa 1",
		}),
	).toHaveAttribute("src", "blob:zone-preview");
	expect(
		within(dialog).getByRole("link", { name: "Lejupielādēt" }),
	).toHaveAttribute("download", `uzdevums-${plan.id}-lapa-1.png`);
	expect(renderPlanningImages).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ id: plan.id, quantity: 10.123456 }),
		expect.any(String),
		expect.any(AbortSignal),
	);
	fireEvent.click(within(dialog).getByRole("button", { name: "Kopēt attēlu" }));
	expect(
		await within(dialog).findByText(
			"Attēlu neizdevās nokopēt. Lejupielādējiet to un pievienojiet WhatsApp sarunā.",
		),
	).toBeInTheDocument();
	fireEvent.change(phone, { target: { value: "00371 (2111) 1111" } });
	fireEvent.change(message, {
		target: { value: "Lūdzu,\n\tpārbaudīt     XPS & grīdu #1" },
	});
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Nosūtīt no Limeni WhatsApp",
		}),
	);
	await waitFor(() =>
		expect(sendPlanningWhatsAppTask).toHaveBeenCalledWith(
			expect.objectContaining({
				siteId: "site",
				planId: plan.id,
				planVersion: plan.version,
				recipient: "37121111111",
				message: "Lūdzu,\npārbaudīt XPS & grīdu #1",
				images: [expect.objectContaining({ page: 1 })],
			}),
		),
	);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	const historySummary = screen
		.getByText("WhatsApp sūtījumi")
		.closest("summary");
	expect(historySummary?.parentElement).toHaveAttribute("open");
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	const reopened = screen.getByRole("dialog");
	const reopenedPhone = within(reopened).getByLabelText(
		"Saņēmēja numurs ar valsts kodu",
	);
	fireEvent.change(reopenedPhone, { target: { value: "not-a-number" } });
	expect(
		within(reopened).getByRole("button", {
			name: "Nosūtīt no Limeni WhatsApp",
		}),
	).toBeDisabled();
	fireEvent.click(within(reopened).getByRole("button", { name: "Atcelt" }));
	expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:zone-preview");
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	expect(screen.getByLabelText("Saņēmēja numurs ar valsts kodu")).toHaveValue(
		planningContact.phone,
	);
	await screen.findByRole("img", { name: "Uzdevuma zona · PDF lapa 1" });
	expect(saveVisualPlanningItem).not.toHaveBeenCalled();
});

it("shows WhatsApp delivery history on the connected planning task", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		plans: [
			{
				...indexedPlan,
				whatsAppSends: [
					{
						id: "send-1",
						planVersion: 2,
						recipient: "37120000000",
						message: "Pārbaudīt darbu",
						status: "sent",
						createdAt: "2026-10-20T09:00:00.000Z",
						completedAt: "2026-10-20T09:00:02.000Z",
						items: [
							{
								ordinal: 0,
								page: 1,
								section: null,
								status: "read",
								metaMessageId: "wamid.1",
								sentAt: "2026-10-20T09:00:02.000Z",
								deliveredAt: "2026-10-20T09:00:04.000Z",
								readAt: "2026-10-20T09:01:00.000Z",
								failedAt: null,
								failureReason: null,
							},
						],
					},
				],
			},
		],
	});
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	const summary = screen.getByText("WhatsApp sūtījumi").closest("summary");
	expect(summary).not.toBeNull();
	expect(summary?.parentElement).not.toHaveAttribute("open");
	fireEvent.click(summary as HTMLElement);
	expect(summary?.parentElement).toHaveAttribute("open");
	const history = screen.getByRole("region", {
		name: "WhatsApp sūtījumu vēsture",
	});
	expect(history).toHaveTextContent("+37120000000");
	expect(history).toHaveTextContent("Izlasīts");
	expect(history).toHaveTextContent("1/1 izlasīti · versija 2");
	expect(history).toHaveTextContent("Pārbaudīt darbu");
	expect(history).toHaveTextContent("PDF lapa 1 · Izlasīts");
});

it("prepares only the selected project section drawing with the saved task's zones", async () => {
	jest.mocked(getVisualPlanning).mockResolvedValue({
		...emptyIndex,
		sections: ["PA1.6", "PA1.7"],
		sectionDrawingCodes: ["PA1.6", "PA1.7"],
		plans: [
			{
				...indexedPlan,
				geometry: { ...indexedPlan.geometry, section: "PA1.6" },
			},
		],
	});
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	expect(
		await screen.findByRole("img", { name: "Sekcijas rasējums · PA1.6" }),
	).toBeInTheDocument();
	expect(screen.queryByRole("img", { name: /PA1.7/ })).not.toBeInTheDocument();
	expect(fetchSectionDrawing).toHaveBeenCalledTimes(1);
	expect(fetchSectionDrawing).toHaveBeenCalledWith(
		"site",
		"PA1.6",
		expect.any(AbortSignal),
	);
});

it("requires a recipient for an unassigned task and blocks sharing unsaved changes", async () => {
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValue({ ...emptyIndex, plans: [indexedPlan] });
	render(
		<VisualPlanningPanel
			siteId="site"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Sagatavot WhatsApp" }));
	await screen.findByRole("img", { name: "Uzdevuma zona · PDF lapa 1" });
	expect(
		screen.getByRole("button", { name: "Nosūtīt no Limeni WhatsApp" }),
	).toBeDisabled();
	fireEvent.change(screen.getByLabelText("Saņēmēja numurs ar valsts kodu"), {
		target: { value: "+371 2000 0000" },
	});
	expect(
		screen.getByRole("button", { name: "Nosūtīt no Limeni WhatsApp" }),
	).toBeEnabled();
	fireEvent.change(screen.getByLabelText("Uzdevuma ziņa"), {
		target: { value: "   " },
	});
	expect(
		screen.getByRole("button", { name: "Nosūtīt no Limeni WhatsApp" }),
	).toBeDisabled();
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "25" },
	});
	expect(
		screen.getByRole("button", { name: "Sagatavot WhatsApp" }),
	).toBeDisabled();
	expect(
		screen.getByText(
			"Pirms uzdevuma sagatavošanas WhatsApp saglabājiet plānu.",
		),
	).toBeInTheDocument();
});

it("shows full history and filters the PDF cumulatively with the bottom slider", async () => {
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

	await screen.findByRole("button", { name: /XPS.*20\.10\.2026/ });
	expect(screen.queryByText("4 / 10 m2 · 40%")).not.toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: /XPS.*20\.10\.2026/ }),
	).toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Faktiskās zonas: 0",
	);
	const slider = screen.getByRole("slider", { name: "Plānošanas datums" });
	const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
	expect(slider).toHaveAttribute("min", String(day("2026-10-01")));
	expect(slider).toHaveAttribute("max", String(day("2026-10-22")));
	expect(slider).toHaveValue(String(day("2026-10-22")));
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent("Fona plāni: 3");
	fireEvent.change(slider, { target: { value: day("2026-10-12") } });
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent("Fona plāni: 2");
	expect(
		screen.getByRole("button", { name: /XPS.*20\.10\.2026/ }),
	).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā diena" }));
	expect(slider).toHaveValue(String(day("2026-10-13")));
	fireEvent.click(screen.getByRole("button", { name: /XPS.*20\.10\.2026/ }));
	expect(slider).toHaveValue(String(day("2026-10-20")));
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna zonas: 1",
	);
	expect(screen.queryByText("Nedēļa")).not.toBeInTheDocument();
	expect(screen.queryByText("Mēnesis")).not.toBeInTheDocument();
	fireEvent.click(sidebarAddZone());
	expect(screen.getByLabelText("Sākuma datums")).toHaveValue("2026-10-20");
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
			start: "2026-10-12",
			end: "2026-10-17",
		}),
	);
	expect(
		container.querySelector(`[data-plan-timeline="${laterPlan.id}"]`),
	).toHaveStyle({ backgroundColor: "#eab308" });
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Fona krāsas: #16a34a,#eab308",
	);
	fireEvent.click(rows[1]);
	expect(
		screen.getByRole("complementary", { name: "Plāna detaļas" }),
	).toHaveAttribute("data-state", "open");
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
		plan: {
			...plan,
			quantity: 12,
			version: 3,
			progress: {
				...indexedPlan.progress,
				progressPercent: 100 / 3,
				variance: -8,
			},
		},
	});
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ });
	expect(screen.queryByText("4 / 10 m2 · 40%")).not.toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent(
		"Plāna zonas: 0",
	);
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
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
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValue({ ...emptyIndex, plans: [indexedPlan] });
	const view = render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={jest.fn()}
		/>,
	);
	await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ });
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
	fireEvent.click(screen.getByRole("button", { name: "Arhivēt" }));
	await waitFor(() =>
		expect(archiveVisualPlanningItem).toHaveBeenCalledWith({
			siteId: "22222222-2222-4222-8222-222222222222",
			id: plan.id,
			version: 2,
		}),
	);
	await waitFor(() =>
		expect(screen.getByRole("switch", { name: "Arhīvs" })).toBeEnabled(),
	);
	expect(screen.queryByRole("slider")).not.toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent("Fona plāni: 0");
	fireEvent.click(screen.getByRole("switch", { name: "Arhīvs" }));
	expect(
		screen.getByRole("slider", { name: "Plānošanas datums" }),
	).toBeInTheDocument();
	expect(screen.getByTestId("planning-pdf")).toHaveTextContent("Fona plāni: 1");
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
	expect(getVisualPlanning).toHaveBeenCalledTimes(1);
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
	await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ });
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
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

it("saves locally immediately, keeps newer edits when the acknowledgement arrives, and never refetches after saving", async () => {
	jest
		.mocked(getVisualPlanning)
		.mockResolvedValue({ ...emptyIndex, plans: [indexedPlan] });
	let finish!: (
		value: Awaited<ReturnType<typeof saveVisualPlanningItem>>,
	) => void;
	jest.mocked(saveVisualPlanningItem).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const onDirtyChange = jest.fn();
	render(
		<VisualPlanningPanel
			siteId="22222222-2222-4222-8222-222222222222"
			drawing={drawing}
			sidebarOpen
			onDirtyChange={onDirtyChange}
		/>,
	);
	fireEvent.click(
		await screen.findByRole("button", { name: /Smilts.*12\.10\.2026/ }),
	);
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "12" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	expect(onDirtyChange).toHaveBeenLastCalledWith(false);
	expect(
		screen.getByText(/serverī vēl nav apstiprināts: 1/),
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Sagatavot WhatsApp" }),
	).toBeDisabled();
	expect(screen.getByLabelText("Plānotais apjoms")).toBeEnabled();
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "99" },
	});
	await act(async () =>
		finish({ ok: true, plan: { ...indexedPlan, quantity: 12, version: 3 } }),
	);
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(99);
	expect(
		screen.getByRole("button", { name: "Saglabāt izmaiņas" }),
	).toBeEnabled();
	expect(getVisualPlanning).toHaveBeenCalledTimes(1);
});

it("keeps a pending local save when changing floors and displays the cached task on return", async () => {
	const cache = new VisualClientCache("22222222-2222-4222-8222-222222222222");
	cache.rememberPlanning(drawing.id, { ...emptyIndex, plans: [indexedPlan] });
	const other = {
		...drawing,
		id: "other",
		state: { ...drawing.state, location: "2. stāvs" },
	};
	cache.rememberPlanning(other.id, { ...emptyIndex, location: "2. stāvs" });
	let finish!: (
		value: Awaited<ReturnType<typeof saveVisualPlanningItem>>,
	) => void;
	jest.mocked(saveVisualPlanningItem).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const props = {
		siteId: "22222222-2222-4222-8222-222222222222",
		sidebarOpen: true,
		onDirtyChange: jest.fn(),
		resourceCache: cache,
	};
	const view = render(
		<VisualPlanningPanel key={drawing.id} {...props} drawing={drawing} />,
	);
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
	fireEvent.change(screen.getByLabelText("Plānotais apjoms"), {
		target: { value: "12" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt izmaiņas" }));
	view.rerender(
		<VisualPlanningPanel key={other.id} {...props} drawing={other} />,
	);
	expect(
		screen.getByText(/serverī vēl nav apstiprināts: 1/),
	).toBeInTheDocument();
	view.rerender(
		<VisualPlanningPanel key={drawing.id} {...props} drawing={drawing} />,
	);
	fireEvent.click(screen.getByRole("button", { name: /Smilts.*12\.10\.2026/ }));
	expect(screen.getByLabelText("Plānotais apjoms")).toHaveValue(12);
	expect(getVisualPlanning).not.toHaveBeenCalled();
	await act(async () =>
		finish({ ok: true, plan: { ...indexedPlan, quantity: 12, version: 3 } }),
	);
	expect(
		screen.queryByText(/serverī vēl nav apstiprināts/),
	).not.toBeInTheDocument();
});
