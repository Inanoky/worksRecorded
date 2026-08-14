import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockGetZtcDialogPrefetchData = jest.fn();
const mockSaveZtcSiteDiaryDialogRows = jest.fn();

jest.mock("@/flows/ztc-production/backend/actions", () => ({
	deleteZtcSiteDiaryRecord: jest.fn(),
	getZtcDialogPrefetchData: (...args: unknown[]) =>
		mockGetZtcDialogPrefetchData(...args),
	saveZtcSiteDiaryDialogRows: (...args: unknown[]) =>
		mockSaveZtcSiteDiaryDialogRows(...args),
}));

jest.mock("@/components/sitediary/Use-media-querty", () => ({
	useMediaQuery: () => false,
}));

jest.mock("sonner", () => ({
	toast: {
		error: jest.fn(),
		success: jest.fn(),
	},
}));

import defaultConfig from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import {
	SearchableZtcSelect,
	ZtcDialogTable,
} from "@/flows/ztc-production/frontend/ZtcDialogTable";

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
}

describe("SearchableZtcSelect custom element values", () => {
	beforeAll(installDomPolyfills);

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
	});

	it("allows a previously unseen element name to be selected", async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<SearchableZtcSelect
				value="J-2-1"
				options={[{ value: "J-2-1", label: "J-2-1" }]}
				placeholder="Izvēlēties"
				width={180}
				allowCustomValue
				customValueMaxLength={80}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByRole("combobox"));
		await user.type(screen.getByPlaceholderText("Meklēt..."), "J-21");
		await user.click(screen.getByRole("button", { name: "Izmantot “J-21”" }));

		expect(onChange).toHaveBeenCalledWith("J-21");
	});

	it("does not offer a duplicate custom value for an existing element", async () => {
		const user = userEvent.setup();
		render(
			<SearchableZtcSelect
				value="J-2-1"
				options={[{ value: "J-2-1", label: "J-2-1" }]}
				placeholder="Izvēlēties"
				width={180}
				allowCustomValue
				onChange={jest.fn()}
			/>,
		);

		await user.click(screen.getByRole("combobox"));
		await user.type(screen.getByPlaceholderText("Meklēt..."), "j-2-1");

		expect(
			screen.queryByRole("button", { name: /Izmantot/ }),
		).not.toBeInTheDocument();
	});
});

describe("ZtcDialogTable project element catalogue", () => {
	beforeAll(installDomPolyfills);

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
	});

	it("shows elements from the selected project outside the focused record", async () => {
		const currentRow = {
			id: "record-1",
			Date: new Date("2026-08-14T07:49:00.000Z"),
			Date_Custom_2: new Date("2026-08-14T08:38:00.000Z"),
			Location: "dz. ēka. auto nojume (rd)",
			Location_Custom_1: "J-22",
			Works: "L0 - minerālvate Knauf expert",
			Comments_Custom_2: JSON.stringify({
				type: "ztc_drawing_context",
				projectName: "OCR projekta nosaukums",
				elements: [
					{
						elementName: "J-22",
						totalAreaM2: 3.78,
						works: [{ name: "L0 - minerālvate Knauf expert", amountM2: 3.78 }],
					},
				],
			}),
		};
		mockGetZtcDialogPrefetchData.mockResolvedValue({
			config: defaultConfig,
			rows: [currentRow],
			rates: [],
			elementCatalogRows: [
				{
					Location: "dz. ēka. auto nojume (rd)",
					Location_Custom_1: "J-23",
					Works: "R1/T1 - Difūzijas membrāna Solitex",
					Comments_Custom_2: JSON.stringify({
						type: "ztc_drawing_context",
						projectName: "Cits OCR projekta nosaukums",
						elements: [
							{
								elementName: "J-23",
								totalAreaM2: 4.1,
								works: [
									{
										name: "R1/T1 - Difūzijas membrāna Solitex",
										amountM2: 4.1,
									},
								],
							},
						],
					}),
				},
				{
					Location: "cits projekts",
					Location_Custom_1: "X-99",
					Works: "L0 - minerālvate Knauf expert",
					Comments_Custom_2: JSON.stringify({
						type: "ztc_drawing_context",
						projectName: "dz. ēka. auto nojume (rd)",
						elements: [
							{
								elementName: "X-99",
								totalAreaM2: 9.9,
								works: [
									{
										name: "L0 - minerālvate Knauf expert",
										amountM2: 9.9,
									},
								],
							},
						],
					}),
				},
			],
		});

		render(
			<ZtcDialogTable
				date={new Date("2026-08-14T12:00:00.000Z")}
				siteId="ztc-site"
				focusedRecordId="record-1"
				initialRows={[currentRow]}
				initialConfig={defaultConfig}
				initialRates={[]}
			/>,
		);

		await waitFor(() =>
			expect(mockGetZtcDialogPrefetchData).toHaveBeenCalled(),
		);
		await userEvent.setup().click(screen.getAllByRole("combobox")[1]);

		expect(
			await screen.findByRole("button", { name: "J-23" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "X-99" }),
		).not.toBeInTheDocument();
	});

	it("renames every visible part of a split task without changing its m2", async () => {
		const rows = [
			{
				id: "11111111-1111-4111-8111-111111111111",
				Date: new Date("2026-08-14T07:49:00.000Z"),
				Date_Custom_2: new Date("2026-08-14T08:10:00.000Z"),
				Location: "Project RD",
				Location_Custom_1: "J-2-1",
				Works: "R1/T1 - Difūzijas membrāna Solitex",
				Units: "m2",
				Amounts: 6,
				TimeInvolved: 1,
				Comments_Custom_2: JSON.stringify({
					type: "ztc_drawing_context",
					elements: [
						{
							elementName: "J-2-1",
							totalAreaM2: 10,
							works: [
								{
									name: "R1/T1 - Difūzijas membrāna Solitex",
									amountM2: 10,
								},
							],
						},
					],
				}),
			},
			{
				id: "22222222-2222-4222-8222-222222222222",
				Date: new Date("2026-08-14T08:11:00.000Z"),
				Date_Custom_2: new Date("2026-08-14T08:38:00.000Z"),
				Location: "Project RD",
				Location_Custom_1: "J-2-1",
				Works: "R1/T1 - Difūzijas membrāna Solitex",
				Units: "m2",
				Amounts: 4,
				TimeInvolved: 0.5,
				Comments_Custom_2: JSON.stringify({
					type: "ztc_drawing_context",
					elements: [
						{
							elementName: "J-2-1",
							totalAreaM2: 10,
							works: [
								{
									name: "R1/T1 - Difūzijas membrāna Solitex",
									amountM2: 10,
								},
							],
						},
					],
				}),
			},
		];
		mockGetZtcDialogPrefetchData.mockResolvedValue({
			config: defaultConfig,
			rows,
			rates: [],
			elementCatalogRows: [],
		});
		mockSaveZtcSiteDiaryDialogRows.mockResolvedValue({
			ok: true,
			updated: 2,
			created: 0,
		});

		render(
			<ZtcDialogTable
				date={new Date("2026-08-14T12:00:00.000Z")}
				siteId="ztc-site"
				initialRows={rows}
				initialConfig={defaultConfig}
				initialRates={[]}
			/>,
		);

		await waitFor(() =>
			expect(
				screen
					.getAllByRole("combobox")
					.filter((element) => element.textContent?.trim() === "J-2-1"),
			).toHaveLength(2),
		);
		const elementSelects = screen
			.getAllByRole("combobox")
			.filter((element) => element.textContent?.trim() === "J-2-1");
		await userEvent.setup().click(elementSelects[0]);
		await userEvent
			.setup()
			.type(screen.getByPlaceholderText("Meklēt..."), "J-21");
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Izmantot “J-21”" }));

		await waitFor(() =>
			expect(
				screen
					.getAllByRole("combobox")
					.filter((element) => element.textContent?.trim() === "J-21"),
			).toHaveLength(2),
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(mockSaveZtcSiteDiaryDialogRows).toHaveBeenCalled(),
		);
		const savedRows =
			mockSaveZtcSiteDiaryDialogRows.mock.calls[0][0].existingRows;
		expect(savedRows).toHaveLength(2);
		expect(
			savedRows.map((row: Record<string, unknown>) => row.Location_Custom_1),
		).toEqual(["J-21", "J-21"]);
		expect(
			savedRows.map((row: Record<string, unknown>) => row.Amounts),
		).toEqual([6, 4]);
	});
});
