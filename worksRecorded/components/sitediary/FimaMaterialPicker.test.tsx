import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useCallback, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaAvailableMaterials,
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { getFimaWarehouseAvailability } from "@/server/actions/fima-warehouse";
import { FimaDiaryCell } from "./FimaDiaryCell";
import { FimaMaterialPicker } from "./FimaMaterialPicker";
import {
	FimaWarehousePreload,
	FimaWarehouseProvider,
	useFimaWarehouseAvailability,
} from "./FimaWarehouseProvider";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaAvailableMaterials: jest.fn(),
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
	refreshFimaBisMaterials: jest.fn(),
}));
jest.mock("@/server/actions/fima-warehouse", () => ({
	getFimaWarehouseAvailability: jest.fn(),
}));

const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const initial: FimaCollaboration = {
	version: 7,
	status: null,
	materials: [],
	history: [],
};
const catalog = [
	{
		id: "m1",
		label: "Cilpas izolators BFA-0000-MSE-0007",
		measurementUnit: "gab.",
		deliveredQuantity: 10,
		usedQuantity: 2,
		availableQuantity: 8,
	},
	{
		id: "m2",
		label: "Slīdcaurule atsvariem BFA-0000-ANC-0017",
		measurementUnit: "komplekts",
		deliveredQuantity: 1,
		usedQuantity: 0.5,
		availableQuantity: 0.5,
	},
	...Array.from({ length: 100 }, (_, index) => ({
		id: `extra-${index}`,
		label: `Papildu materiāls ${index}`,
		measurementUnit: "m",
		deliveredQuantity: 10,
		usedQuantity: 0,
		availableQuantity: 10,
	})),
];
const originalResizeObserver = globalThis.ResizeObserver;
beforeAll(() => {
	globalThis.ResizeObserver = class {
		observe = jest.fn();
		unobserve = jest.fn();
		disconnect = jest.fn();
	};
});
afterAll(() => {
	globalThis.ResizeObserver = originalResizeObserver;
});
beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(getFimaWarehouseAvailability)
		.mockResolvedValue(catalog.slice(0, 2));
	jest.mocked(saveFimaDiaryCollaboration).mockImplementation(async (args) => ({
		...initial,
		version: 8,
		materials: args.kind === "materials" ? args.materials : [],
	}));
});

function Ready() {
	const warehouse = useFimaWarehouseAvailability(siteId, false);
	return warehouse.loadedAt ? <span>Noliktava gatava</span> : null;
}
function Harness({ seed = initial }: { seed?: FimaCollaboration }) {
	const [state, setState] = useState(seed);
	const change = useCallback(
		(_id: string, next: FimaCollaboration) => setState(next),
		[],
	);
	return (
		<FimaWarehouseProvider>
			<FimaWarehousePreload siteId={siteId} />
			<Ready />
			<FimaDiaryCell
				materialEditor
				field="FimaMaterials"
				siteId={siteId}
				row={{ id: "record", fimaCollaboration: state }}
				onChange={change}
			/>
		</FimaWarehouseProvider>
	);
}
async function open(seed?: FimaCollaboration) {
	render(<Harness seed={seed} />);
	await screen.findByText("Noliktava gatava");
	fireEvent.click(screen.getByRole("button", { name: "Pārvaldīt materiālus" }));
	return screen.getByRole("dialog");
}

it("immediately reuses the complete Noliktava cache without another material call or record polling", async () => {
	jest.mocked(getFimaWarehouseAvailability).mockResolvedValue(catalog);
	const dialog = await open();
	expect(within(dialog).getAllByRole("checkbox")).toHaveLength(102);
	expect(within(dialog).getByText("Papildu materiāls 99")).toBeInTheDocument();
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
	expect(getFimaAvailableMaterials).not.toHaveBeenCalled();
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	jest.useFakeTimers();
	try {
		act(() => jest.advanceTimersByTime(45_000));
	} finally {
		jest.useRealTimers();
	}
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
});

it("filters, selects and edits locally, accepts decimal commas and saves the entire selection once", async () => {
	const dialog = await open();
	const search = within(dialog).getByRole("textbox", {
		name: "Meklēt materiālu",
	});
	fireEvent.change(search, { target: { value: "mse 0007" } });
	await waitFor(() =>
		expect(within(dialog).getAllByRole("checkbox")).toHaveLength(1),
	);
	fireEvent.click(
		within(dialog).getByRole("checkbox", {
			name: `Atlasīt: ${catalog[0].label}`,
		}),
	);
	fireEvent.change(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
		{ target: { value: "3" } },
	);
	fireEvent.change(search, { target: { value: "ANC-0017" } });
	await waitFor(() =>
		expect(within(dialog).getByText(catalog[1].label)).toBeInTheDocument(),
	);
	fireEvent.change(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[1].label}`,
		}),
		{ target: { value: "0,25" } },
	);
	expect(
		within(dialog).getByRole("checkbox", {
			name: `Atlasīt: ${catalog[1].label}`,
		}),
	).toBeChecked();
	fireEvent.change(search, { target: { value: "" } });
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Tikai atlasītie (2)" }),
	);
	await waitFor(() =>
		expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2),
	);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledTimes(1);
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledWith(
		expect.objectContaining({
			siteId,
			recordId: "record",
			kind: "materials",
			expectedVersion: 7,
			materials: [
				{ id: "m1", label: catalog[0].label, unit: "gab.", quantity: 3 },
				{
					id: "m2",
					label: catalog[1].label,
					unit: "komplekts",
					quantity: 0.25,
				},
			],
		}),
	);
});

it("blocks invalid and excessive quantities locally without sending anything", async () => {
	const dialog = await open();
	const input = within(dialog).getByRole("textbox", {
		name: `Daudzums: ${catalog[0].label}`,
	});
	fireEvent.change(input, { target: { value: "9" } });
	expect(input).toHaveAttribute("aria-invalid", "true");
	expect(within(dialog).getByText("Pieejams: 8 gab.")).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	).toBeDisabled();
	for (const value of ["0", "-1", "", "abc"]) {
		fireEvent.change(input, { target: { value } });
		expect(
			within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
		).toBeDisabled();
	}
	fireEvent.change(input, { target: { value: "2" } });
	expect(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	).toBeEnabled();
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
});

it("preserves the selection on a server failure and reuses the request ID for a retry", async () => {
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockRejectedValueOnce(new Error("BIS atlikums ir mainījies"));
	const dialog = await open();
	fireEvent.change(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
		{ target: { value: "2" } },
	);
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	);
	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"BIS atlikums ir mainījies",
	);
	expect(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
	).toHaveValue("2");
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	const calls = jest.mocked(saveFimaDiaryCollaboration).mock.calls;
	expect(calls).toHaveLength(2);
	expect(calls[0][0].requestId).toBe(calls[1][0].requestId);
});

it("cancels locally and starts with the saved selection when reopened", async () => {
	const seed = {
		...initial,
		materials: [
			{ id: "m1", label: catalog[0].label, unit: "gab.", quantity: 2 },
		],
	};
	const dialog = await open(seed);
	fireEvent.change(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
		{ target: { value: "4" } },
	);
	fireEvent.click(within(dialog).getByRole("button", { name: "Atcelt" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Pārvaldīt materiālus" }));
	expect(
		screen.getByRole("textbox", { name: `Daudzums: ${catalog[0].label}` }),
	).toHaveValue("2");
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
});

it("keeps previously selected unavailable materials visible until explicitly removed", async () => {
	const seed = {
		...initial,
		materials: [
			{ id: "missing", label: "Vecais materiāls", unit: "gab.", quantity: 2 },
		],
	};
	const dialog = await open(seed);
	expect(within(dialog).getByText("Vecais materiāls")).toBeInTheDocument();
	expect(
		within(dialog).getByText(/Materiāls šajā BIS lietā vairs nav pieejams/),
	).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	).toBeDisabled();
	fireEvent.click(
		within(dialog).getByRole("checkbox", { name: "Atlasīt: Vecais materiāls" }),
	);
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Saglabāt materiālus" }),
	);
	await waitFor(() =>
		expect(saveFimaDiaryCollaboration).toHaveBeenCalledWith(
			expect.objectContaining({ materials: [] }),
		),
	);
});

it("keeps cached stock and the local draft if an explicit warehouse refresh fails", async () => {
	const dialog = await open();
	fireEvent.change(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
		{ target: { value: "2" } },
	);
	jest
		.mocked(getFimaWarehouseAvailability)
		.mockRejectedValueOnce(new Error("BIS nav pieejams"));
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Atjaunot atlikumus" }),
	);
	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"BIS nav pieejams",
	);
	expect(
		within(dialog).getByRole("textbox", {
			name: `Daudzums: ${catalog[0].label}`,
		}),
	).toHaveValue("2");
	expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2);
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
});

it("loads only the requested project when its cache is missing", async () => {
	const onChange = jest.fn();
	render(
		<FimaWarehouseProvider>
			<Dialog open>
				<FimaMaterialPicker
					siteId="another-project"
					recordId="other-record"
					state={initial}
					onChange={onChange}
					onClose={jest.fn()}
					onSavingChange={jest.fn()}
				/>
			</Dialog>
		</FimaWarehouseProvider>,
	);
	await screen.findByText(catalog[0].label);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledWith("another-project");
	expect(saveFimaDiaryCollaboration).not.toHaveBeenCalled();
});

it("reuses older warehouse data without an automatic refresh on opening the picker", async () => {
	render(<Harness />);
	await screen.findByText("Noliktava gatava");
	const now = Date.now();
	const clock = jest.spyOn(Date, "now").mockReturnValue(now + 10 * 60_000);
	try {
		fireEvent.click(
			screen.getByRole("button", { name: "Pārvaldīt materiālus" }),
		);
		expect(screen.getByText(catalog[0].label)).toBeInTheDocument();
		expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
	} finally {
		clock.mockRestore();
	}
});
