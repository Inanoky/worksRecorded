import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateZtcDefaultTaskRates = jest.fn();

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

function renderDialog() {
	const onSaved = jest.fn();
	render(
		<ZtcDefaultRatesDialog
			open
			siteId="ztc-site"
			rates={allProjectRates}
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
