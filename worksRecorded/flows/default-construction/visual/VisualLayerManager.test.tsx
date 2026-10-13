import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	defaultVisualLayerSettings,
	type VisualLayerConfiguration,
	type VisualLayerSettings,
} from "./layer-settings";
import { VisualLayerManager } from "./VisualLayerManager";

function setup(
	extra: Partial<VisualLayerConfiguration> = {},
	onSave = jest.fn(async (_settings: VisualLayerSettings) => {}),
) {
	const configuration: VisualLayerConfiguration = {
		settings: defaultVisualLayerSettings(),
		workOptions: ["Smilts 20mm", "XPS 150mm"],
		positionIds: { "xps 150mm": "position-1" },
		...extra,
	};
	const onClose = jest.fn();
	render(
		<VisualLayerManager
			configuration={configuration}
			onSave={onSave}
			onClose={onClose}
		/>,
	);
	return { configuration, onSave, onClose };
}

it("keeps rename and colour edits local until saving", async () => {
	const { configuration, onSave, onClose } = setup();
	fireEvent.change(screen.getByLabelText("Slāņa nosaukums"), {
		target: { value: "Smilšu slānis" },
	});
	fireEvent.change(screen.getByLabelText("Krāsa"), {
		target: { value: "#123456" },
	});
	expect(onSave).not.toHaveBeenCalled();
	expect(configuration.settings.categories[0].label).toBe("Smilts");
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() => expect(onClose).toHaveBeenCalled());
	expect(onSave.mock.calls[0][0].categories[0]).toEqual({
		id: "sand",
		label: "Smilšu slānis",
		color: "#123456",
	});
});

it("cancels without writing", () => {
	const { onSave, onClose } = setup();
	fireEvent.change(screen.getByLabelText("Slāņa nosaukums"), {
		target: { value: "Draft" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	expect(onClose).toHaveBeenCalled();
	expect(onSave).not.toHaveBeenCalled();
});

it("adds a category and links a work with its stable Forma 2 ID", async () => {
	const random = jest
		.spyOn(crypto, "randomUUID")
		.mockReturnValue("11111111-1111-4111-8111-111111111111");
	const { onSave } = setup();
	fireEvent.click(screen.getByRole("button", { name: "Pievienot slāni" }));
	fireEvent.change(screen.getByLabelText("Slāņa nosaukums"), {
		target: { value: "XPS 150 mm" },
	});
	fireEvent.change(screen.getByLabelText("Slānis: XPS 150mm"), {
		target: { value: "custom-11111111-1111-4111-8111-111111111111" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() => expect(onSave).toHaveBeenCalled());
	expect(onSave.mock.calls[0][0].works).toEqual([
		{
			work: "XPS 150mm",
			positionId: "position-1",
			layerId: "custom-11111111-1111-4111-8111-111111111111",
		},
	]);
	random.mockRestore();
});

it("requires deletion confirmation and reassigns instead of dropping zones", async () => {
	const settings = defaultVisualLayerSettings();
	settings.zones.push({
		drawingId: "drawing",
		markId: "polygon",
		layerId: "sand",
	});
	const { onSave } = setup({ settings });
	fireEvent.click(screen.getByRole("button", { name: "Dzēst slāni" }));
	expect(onSave).not.toHaveBeenCalled();
	fireEvent.change(screen.getByLabelText("Aizvietojošais slānis"), {
		target: { value: "xps" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Apstiprināt dzēšanu" }));
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() => expect(onSave).toHaveBeenCalled());
	expect(onSave.mock.calls[0][0].zones[0].layerId).toBe("xps");
	expect(onSave.mock.calls[0][0].redirects.sand).toBe("xps");
});

it("retains draft edits on a failed save", async () => {
	const onSave = jest.fn(async (_settings: VisualLayerSettings) => {
		throw new Error("Concurrent edit");
	});
	const { onClose } = setup({}, onSave);
	fireEvent.change(screen.getByLabelText("Slāņa nosaukums"), {
		target: { value: "Draft name" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	expect(await screen.findByRole("alert")).toHaveTextContent("Concurrent edit");
	expect(screen.getByLabelText("Slāņa nosaukums")).toHaveValue("Draft name");
	expect(onClose).not.toHaveBeenCalled();
});

it("paginates and searches a large work list", () => {
	setup({ workOptions: Array.from({ length: 25 }, (_, i) => `Work ${i}`) });
	expect(screen.getByText("1–10 no 25")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā" }));
	expect(screen.getByText("11–20 no 25")).toBeInTheDocument();
	fireEvent.change(screen.getByLabelText("Meklēt darbu"), {
		target: { value: "Work 24" },
	});
	expect(screen.getByText("1–1 no 1")).toBeInTheDocument();
});

it("can remove an inherited estimate mapping after a work rename", async () => {
	const settings = defaultVisualLayerSettings();
	settings.works.push({
		work: "Old XPS work",
		positionId: "position-1",
		layerId: "sand",
	});
	const { onSave } = setup({ settings });
	expect(screen.getByLabelText("Slānis: XPS 150mm")).toHaveValue("sand");
	fireEvent.change(screen.getByLabelText("Slānis: XPS 150mm"), {
		target: { value: "automatic" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() => expect(onSave).toHaveBeenCalled());
	expect(onSave.mock.calls[0][0].works).toEqual([]);
});
