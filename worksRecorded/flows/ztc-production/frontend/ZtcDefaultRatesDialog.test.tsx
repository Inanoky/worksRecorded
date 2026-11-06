import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateZtcDefaultTaskRates = jest.fn();
const mockPrintZtcTaskRates = jest.fn();

jest.mock("@/flows/ztc-production/lib/ztc-rates-print", () => ({
	printZtcTaskRates: (...args: unknown[]) => mockPrintZtcTaskRates(...args),
}));

jest.mock("@/flows/ztc-production/backend/actions", () => ({
	updateZtcDefaultTaskRates: (...args: unknown[]) =>
		mockUpdateZtcDefaultTaskRates(...args),
}));

jest.mock("sonner", () => ({
	toast: {
		error: jest.fn(),
		success: jest.fn(),
	},
}));

import type { ZtcProjectTaskRates } from "@/flows/ztc-production/backend/actions";
import { ZtcDefaultRatesDialog } from "@/flows/ztc-production/frontend/ZtcDefaultRatesDialog";

const allProjectRates: ZtcProjectTaskRates[] = [
	{
		projectName: "Visi projekti",
		works: [
			{ task: "1 koeficients", rate: "1", unit: "m2" },
			{
				task: "latojums 25x45",
				rate: "0.9",
				unit: "m2",
				laborNorm: "0.06",
			},
		],
		additionalDetails: [],
		additionalWorks: [
			{
				task: "CNC projekts",
				rate: "15",
				unit: "st",
				relatesToElement: false,
			},
		],
	},
];

function installDomPolyfills() {
	Object.defineProperty(globalThis, "ResizeObserver", {
		configurable: true,
		value: class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	});
	Object.defineProperty(globalThis, "PointerEvent", {
		configurable: true,
		value: MouseEvent,
	});
	Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
		configurable: true,
		value: () => false,
	});
	Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
		configurable: true,
		value: () => undefined,
	});
	Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
		configurable: true,
		value: () => undefined,
	});
	Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
		configurable: true,
		value: () => undefined,
	});
}

function renderDialog(rates = allProjectRates) {
	const onSaved = jest.fn();
	render(
		<ZtcDefaultRatesDialog
			open
			siteId="ztc-site"
			rates={rates}
			projectOptions={["test projekts"]}
			onOpenChange={jest.fn()}
			onSaved={onSaved}
		/>,
	);
	return { onSaved };
}

async function selectProject(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(
		await screen.findByRole("option", { name: "test projekts" }),
	);
}

function savedProject() {
	const args = mockUpdateZtcDefaultTaskRates.mock.calls.at(-1)?.[0] as {
		rates: ZtcProjectTaskRates[];
	};
	return args.rates.find((project) => project.projectName === "test projekts");
}

describe("ZtcDefaultRatesDialog project inheritance", () => {
	beforeAll(installDomPolyfills);

	beforeEach(() => {
		mockUpdateZtcDefaultTaskRates.mockImplementation(async ({ rates }) => ({
			ok: true,
			rates,
		}));
	});

	it("prints every category for the selected project with unsaved edits regardless of search", async () => {
		const user = userEvent.setup();
		renderDialog([
			...allProjectRates,
			{
				projectName: "test projekts",
				works: [
					{ task: "latojums 25x45", rate: "2", unit: "m2", laborNorm: "0.1" },
				],
				additionalDetails: [{ task: "Kronšteins", rate: "3", unit: "gab" }],
				additionalWorks: [
					{
						task: "CNC projekts",
						rate: "20",
						unit: "st",
						relatesToElement: true,
					},
				],
			},
			{
				projectName: "Cits projekts",
				manual: true,
				works: [{ task: "Cits darbs", rate: "99", unit: "m2" }],
				additionalDetails: [],
				additionalWorks: [],
			},
		]);
		await selectProject(user);
		fireEvent.change(screen.getByDisplayValue("2"), {
			target: { value: "2,5" },
		});
		fireEvent.change(screen.getByPlaceholderText("Meklēt likmi..."), {
			target: { value: "latojums" },
		});
		fireEvent.change(screen.getByDisplayValue("0.1"), {
			target: { value: "0,12" },
		});
		await user.click(screen.getByRole("button", { name: "Drukāt" }));

		expect(mockPrintZtcTaskRates).toHaveBeenCalledWith(
			"test projekts",
			[
				{
					category: "works",
					label: "Darbi",
					rows: [
						expect.objectContaining({ task: "1 koeficients", rate: "1" }),
						expect.objectContaining({
							task: "latojums 25x45",
							rate: "2,5",
							laborNorm: "0,12",
						}),
					],
				},
				{
					category: "additionalDetails",
					label: "Papilddetāļas",
					rows: [expect.objectContaining({ task: "Kronšteins", rate: "3" })],
				},
				{
					category: "additionalWorks",
					label: "Papilddarbi",
					rows: [
						expect.objectContaining({
							task: "CNC projekts",
							rate: "20",
							relatesToElement: true,
						}),
					],
				},
			],
			expect.any(Function),
		);
		expect(mockUpdateZtcDefaultTaskRates).not.toHaveBeenCalled();
	});

	it("prints global rates and respects project exclusions after switching projects", async () => {
		const user = userEvent.setup();
		renderDialog();
		await user.click(screen.getByRole("button", { name: "Drukāt" }));
		expect(mockPrintZtcTaskRates.mock.calls[0][0]).toBe("Visi projekti");
		expect(mockPrintZtcTaskRates.mock.calls[0][1][0].rows).toHaveLength(2);
		await selectProject(user);
		await user.click(screen.getByRole("button", { name: "Dzēst likmi" }));
		await user.click(screen.getByRole("button", { name: "Drukāt" }));
		expect(mockPrintZtcTaskRates.mock.calls[1][0]).toBe("test projekts");
		expect(mockPrintZtcTaskRates.mock.calls[1][1][0].rows).toEqual([
			expect.objectContaining({ task: "1 koeficients", rate: "1" }),
		]);
	});

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
	});

	it("allows an inherited row to be edited and deleted immediately", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);

		expect(screen.getByDisplayValue("latojums 25x45")).toBeEnabled();
		expect(screen.getByRole("button", { name: "Dzēst likmi" })).toBeEnabled();
	});

	it("persists deletion as a project exclusion without deleting the global rate", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);

		await user.click(screen.getByRole("button", { name: "Dzēst likmi" }));
		expect(
			screen.queryByDisplayValue("latojums 25x45"),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Saglabāt" }));

		await waitFor(() =>
			expect(mockUpdateZtcDefaultTaskRates).toHaveBeenCalled(),
		);
		expect(savedProject()).toMatchObject({
			works: [],
			excludedTasks: { works: ["latojums 25x45"] },
		});
		const savedGlobal = (
			mockUpdateZtcDefaultTaskRates.mock.calls.at(-1)?.[0] as {
				rates: ZtcProjectTaskRates[];
			}
		).rates.find((project) => project.projectName === "Visi projekti");
		expect(savedGlobal?.works.map((entry) => entry.task)).toContain(
			"latojums 25x45",
		);
	});

	it("does not create project overrides merely by switching tabs", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);

		await user.click(screen.getByRole("tab", { name: "Papilddarbi" }));
		await user.click(screen.getByRole("tab", { name: "Darbi" }));
		await user.click(screen.getByRole("button", { name: "Saglabāt" }));

		await waitFor(() =>
			expect(mockUpdateZtcDefaultTaskRates).toHaveBeenCalled(),
		);
		expect(savedProject()).toMatchObject({
			works: [],
			additionalDetails: [],
			additionalWorks: [],
			excludedTasks: {
				works: [],
				additionalDetails: [],
				additionalWorks: [],
			},
		});
	});

	it("creates one override and excludes the inherited name when it is renamed", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);

		fireEvent.change(screen.getByDisplayValue("latojums 25x45"), {
			target: { value: "latojums 28x45" },
		});
		await user.click(screen.getByRole("button", { name: "Saglabāt" }));

		await waitFor(() =>
			expect(mockUpdateZtcDefaultTaskRates).toHaveBeenCalled(),
		);
		expect(savedProject()?.works).toEqual([
			expect.objectContaining({
				task: "latojums 28x45",
				rate: "0.9",
				unit: "m2",
			}),
		]);
		expect(savedProject()?.excludedTasks?.works).toEqual(["latojums 25x45"]);
	});

	it("keeps coefficient rows protected", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);

		expect(screen.getByDisplayValue("1 koeficients")).toBeDisabled();
		expect(screen.getAllByRole("button", { name: "Dzēst likmi" })).toHaveLength(
			1,
		);
	});

	it("stores an element attachment override for inherited Papilddarbi", async () => {
		const user = userEvent.setup();
		renderDialog();
		await selectProject(user);
		await user.click(screen.getByRole("tab", { name: "Papilddarbi" }));

		await user.click(
			screen.getByRole("checkbox", {
				name: "Papilddarbs attiecas uz projektu un elementu",
			}),
		);
		await user.click(screen.getByRole("button", { name: "Saglabāt" }));

		await waitFor(() =>
			expect(mockUpdateZtcDefaultTaskRates).toHaveBeenCalled(),
		);
		expect(savedProject()?.additionalWorks).toEqual([
			expect.objectContaining({
				task: "CNC projekts",
				rate: "15",
				unit: "st",
				relatesToElement: true,
			}),
		]);
	});
});
