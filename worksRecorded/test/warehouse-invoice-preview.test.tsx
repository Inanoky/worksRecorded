import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import MaterialsTableClient from "@/app/dashboard/sites/[siteId]/BIS/Components/materials-table-client";
import { WorkspaceActivityContext } from "@/components/projects/WorkspaceActivity";

jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	UploadButton: () => null,
}));
jest.mock("@/flows/default-construction/frontend/DiaryFeedbackBrain", () => ({
	DiaryFeedbackBrain: () => null,
}));
jest.mock(
	"@/flows/default-construction/backend/forma2-analytics-actions",
	() => ({}),
);
jest.mock(
	"@/flows/default-construction/frontend/DefaultConstructionForma2PdfPreview",
	() => ({
		DefaultConstructionForma2PdfPreview: ({ url }: { url: string }) => (
			<div data-testid="pdf-preview" data-url={url} />
		),
	}),
);

type Props = ComponentProps<typeof MaterialsTableClient>;
const materials: Props["materials"] = [
	"Concrete",
	"Pump",
	"Sand",
	"No document",
].map((name, index) => ({
	id: String(index),
	name,
	quantity: 1,
	categoryId: null,
	categoryName: null,
	measurementUnitId: null,
	measurementUnit: "m3",
	cost: 100,
	invoiceNr: index < 2 ? "INV-1" : "INV-2",
	invoiceDate: null,
	materialDate: null,
	supplierName: "Supplier",
	importBatchId: null,
	sourcePhoto:
		index === 3
			? null
			: index < 2
				? "https://example.com/one.pdf"
				: "https://example.com/two.jpg",
	BISId: null,
	bisStatus: null,
	createdAt: new Date("2026-09-25T12:00:00Z"),
	bisApprovers: [],
}));

function props(): Props {
	return {
		siteId: "site",
		organizationLanguage: "en",
		showSpendInsights: false,
		bisEnabled: false,
		bisBaseUrl: "https://example.com",
		materials,
		isDefaultConstructionFlow: true,
		forma2Enabled: false,
		forma2PositionOptions: [],
		materialConfigurations: [],
		materialMeasures: [],
		materialTypes: [],
		transferTargets: [],
		initialPagination: {
			totalCount: 4,
			totalCost: 400,
			page: 1,
			pageSize: 30,
			totalPages: 1,
		},
		exportMaterials: jest.fn(),
		sendToBis: jest.fn(),
		updateSentRecordInBis: jest.fn(),
		getPossibleApprovers: jest.fn(),
		submitToApproval: jest.fn(),
		syncBisRecords: jest.fn(),
		updateMaterialConfiguration: jest.fn(),
		createMaterialConfiguration: jest.fn(),
		updateMaterialDate: jest.fn(),
		updateQuantity: jest.fn(),
		updateMaterialDetails: jest.fn(),
		getSourcePhotoPositionCount: jest.fn(),
		updateRelatedPhotoDates: jest.fn(),
		updateMaterialAttachments: jest.fn(),
		attachCertificate: jest.fn(),
		copyMaterialRecord: jest.fn(),
		deleteRecords: jest.fn(),
		moveRecordsToProject: jest.fn(),
	};
}

beforeEach(() => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: 1440,
	});
});

it("opens beside the table, highlights the invoice rows, switches documents and closes locally", () => {
	const input = props();
	render(<MaterialsTableClient {...input} />);
	expect(
		screen.queryByRole("region", { name: "Invoice preview" }),
	).not.toBeInTheDocument();
	const triggers = screen.getAllByRole("button", {
		name: "Open invoice: INV-1",
	});
	fireEvent.click(triggers[0]);
	expect(screen.getByTestId("pdf-preview")).toHaveAttribute(
		"data-url",
		materials[0].sourcePhoto,
	);
	expect(screen.getByRole("table")).toBeInTheDocument();
	for (const trigger of triggers) {
		expect(trigger).toHaveAttribute("aria-pressed", "true");
		expect(trigger.closest("tr")).toHaveClass("bg-primary/5");
	}
	const next = screen.getByRole("button", { name: "Open invoice: INV-2" });
	fireEvent.click(next);
	const panel = screen.getByRole("region", { name: "Invoice preview" });
	expect(within(panel).getByRole("img", { name: "INV-2" })).toHaveAttribute(
		"src",
		materials[2].sourcePhoto,
	);
	expect(screen.queryByTestId("pdf-preview")).not.toBeInTheDocument();
	expect(triggers[0]).toHaveAttribute("aria-pressed", "false");
	fireEvent.click(within(panel).getByRole("button", { name: "Close preview" }));
	expect(
		screen.queryByRole("region", { name: "Invoice preview" }),
	).not.toBeInTheDocument();
	expect(next).toHaveFocus();
	expect(screen.getByRole("table")).toBeInTheDocument();
	expect(input.exportMaterials).not.toHaveBeenCalled();
	expect(input.updateMaterialDetails).not.toHaveBeenCalled();
});

it("keeps external document links for other flows and no preview action for missing documents", () => {
	render(
		<MaterialsTableClient {...props()} isDefaultConstructionFlow={false} />,
	);
	expect(screen.getByRole("link", { name: "Concrete" })).toHaveAttribute(
		"target",
		"_blank",
	);
	expect(
		screen.queryByRole("button", { name: /Open invoice:/ }),
	).not.toBeInTheDocument();
	expect(
		screen.queryByRole("link", { name: "No document" }),
	).not.toBeInTheDocument();
});

it("uses Latvian preview labels and clears a removed record preview", () => {
	const input = props();
	const { rerender } = render(
		<MaterialsTableClient {...input} organizationLanguage="lv" />,
	);
	fireEvent.click(
		screen.getAllByRole("button", { name: "Atvērt rēķinu: INV-1" })[0],
	);
	expect(
		screen.getByRole("region", { name: "Rēķina priekšskatījums" }),
	).toBeInTheDocument();
	rerender(
		<MaterialsTableClient
			{...input}
			organizationLanguage="lv"
			materials={[]}
		/>,
	);
	expect(
		screen.queryByRole("region", { name: "Rēķina priekšskatījums" }),
	).not.toBeInTheDocument();
});

it("restores the unfiltered page after a filter is cleared", async () => {
	const input = props();
	input.materials = Array.from({ length: 120 }, (_, index) => ({
		...materials[index % materials.length],
		id: `row-${index}`,
	}));
	input.initialPagination = {
		...input.initialPagination,
		page: 3,
		totalCount: 1200,
		totalPages: 40,
	};

	render(<MaterialsTableClient {...input} />);

	const pageInputs = screen.getAllByRole("spinbutton", { name: "Page" });
	const searchInput = screen.getByRole("textbox", { name: /Search materials/ });
	for (const pageInput of pageInputs) expect(pageInput).toHaveValue(3);

	fireEvent.change(searchInput, { target: { value: "Optimera" } });
	for (const pageInput of pageInputs) expect(pageInput).toHaveValue(1);

	fireEvent.change(searchInput, { target: { value: "" } });
	for (const pageInput of pageInputs) expect(pageInput).toHaveValue(3);
	expect(input.exportMaterials).not.toHaveBeenCalled();
});

it("filters by suppliers from the full analytics list and accepts custom values", async () => {
	const input = props();
	input.showSpendInsights = true;
	input.materials = materials.map((material, index) => ({
		...material,
		supplierName: index < 3 ? "Supplier A" : "Supplier B",
	}));
	input.initialPagination = {
		...input.initialPagination,
		spendInsights: {
			supplierTotals: [
				{ key: "supplier-a", label: "Supplier A", totalCost: 300, count: 3 },
				{ key: "supplier-b", label: "Supplier B", totalCost: 100, count: 1 },
			],
			monthlyTotals: [],
		},
	};

	render(<MaterialsTableClient {...input} />);

	const supplierInput = screen.getByLabelText("Supplier");
	const supplierList = document.getElementById(
		supplierInput.getAttribute("list") ?? "",
	);
	expect(supplierInput).toHaveAttribute("list");
	expect(supplierList?.querySelectorAll("option")).toHaveLength(2);
	expect(
		supplierList?.querySelector('option[value="Supplier B"]'),
	).not.toBeNull();

	fireEvent.click(screen.getByRole("button", { name: /Supplier A/ }));
	expect(input.exportMaterials).not.toHaveBeenCalled();

	fireEvent.change(supplierInput, { target: { value: "Custom supplier" } });
	expect(input.exportMaterials).not.toHaveBeenCalled();

	const supplierClear = screen.getByRole("button", {
		name: "Clear filters: Supplier",
	});
	expect(supplierInput.parentElement?.firstElementChild).toBe(supplierClear);
	fireEvent.click(supplierClear);
	expect(supplierInput).toHaveValue("");
});

it("shows an inline clear button for the invoice number dropdown", () => {
	render(<MaterialsTableClient {...props()} />);

	const invoiceInput = screen.getByLabelText("Invoice number");
	fireEvent.change(invoiceInput, { target: { value: "INV-1" } });
	const invoiceClear = screen.getByRole("button", {
		name: "Clear filters: Invoice number",
	});
	expect(invoiceInput.parentElement?.firstElementChild).toBe(invoiceClear);
	fireEvent.click(invoiceClear);

	expect(invoiceInput).toHaveValue("");
});

it("replaces supplier options when the warehouse site changes", async () => {
	const firstSite = props();
	firstSite.showSpendInsights = true;
	firstSite.materials = materials.map((material) => ({
		...material,
		supplierName: "Site A supplier",
	}));
	firstSite.initialPagination = {
		...firstSite.initialPagination,
		spendInsights: {
			supplierTotals: [
				{ key: "site-a", label: "Site A supplier", totalCost: 100, count: 1 },
			],
			monthlyTotals: [],
		},
	};
	const { rerender } = render(
		<MaterialsTableClient key={firstSite.siteId} {...firstSite} />,
	);

	const secondSite = {
		...firstSite,
		siteId: "site-b",
		materials: materials.map((material) => ({
			...material,
			supplierName: "Site B supplier",
		})),
		initialPagination: {
			...firstSite.initialPagination,
			spendInsights: {
				supplierTotals: [
					{ key: "site-b", label: "Site B supplier", totalCost: 200, count: 2 },
				],
				monthlyTotals: [],
			},
		},
	};
	rerender(<MaterialsTableClient key={secondSite.siteId} {...secondSite} />);

	await waitFor(() => {
		const supplierInput = screen.getByLabelText("Supplier");
		const supplierList = document.getElementById(
			supplierInput.getAttribute("list") ?? "",
		);
		expect(
			supplierList?.querySelector('option[value="Site A supplier"]'),
		).toBeNull();
		expect(
			supplierList?.querySelector('option[value="Site B supplier"]'),
		).not.toBeNull();
	});
});

it("replaces supplier options when refreshed analytics changes in a mounted warehouse", async () => {
	const input = props();
	input.showSpendInsights = true;
	input.materials = materials.map((material) => ({
		...material,
		supplierName: "Old supplier",
	}));
	input.initialPagination = {
		...input.initialPagination,
		spendInsights: {
			supplierTotals: [
				{ key: "old", label: "Old supplier", totalCost: 100, count: 1 },
			],
			monthlyTotals: [],
		},
	};
	const { rerender } = render(<MaterialsTableClient {...input} />);

	const refreshedInput = {
		...input,
		materials: materials.map((material) => ({
			...material,
			supplierName: "New supplier",
		})),
		initialPagination: {
			...input.initialPagination,
			spendInsights: {
				supplierTotals: [
					{ key: "new", label: "New supplier", totalCost: 200, count: 2 },
				],
				monthlyTotals: [],
			},
		},
	};
	rerender(<MaterialsTableClient {...refreshedInput} />);

	await waitFor(() => {
		const supplierInput = screen.getByLabelText("Supplier");
		const supplierList = document.getElementById(
			supplierInput.getAttribute("list") ?? "",
		);
		expect(
			supplierList?.querySelector('option[value="Old supplier"]'),
		).toBeNull();
		expect(
			supplierList?.querySelector('option[value="New supplier"]'),
		).not.toBeNull();
	});
});

it("does not refetch retained warehouse data when its project becomes active again", () => {
	const input = props();
	const renderWarehouse = (active: boolean) => (
		<WorkspaceActivityContext.Provider
			value={{ active, managed: true, protect: jest.fn() }}
		>
			<MaterialsTableClient {...input} />
		</WorkspaceActivityContext.Provider>
	);
	const { rerender } = render(renderWarehouse(true));
	expect(input.exportMaterials).not.toHaveBeenCalled();

	rerender(renderWarehouse(false));
	rerender(renderWarehouse(true));

	expect(input.exportMaterials).not.toHaveBeenCalled();
});

it("keeps retained projects bound to their own supplier and invoice datalists", () => {
	const siteA = props();
	siteA.siteId = "site-a";
	siteA.showSpendInsights = true;
	siteA.materials = materials.map((material) => ({
		...material,
		invoiceNr: "SITE-A-INVOICE",
		supplierName: "Site A supplier",
	}));
	siteA.initialPagination = {
		...siteA.initialPagination,
		spendInsights: {
			supplierTotals: [
				{ key: "site-a", label: "Site A supplier", totalCost: 400, count: 4 },
			],
			monthlyTotals: [],
		},
	};
	const siteB = props();
	siteB.siteId = "site-b";
	siteB.showSpendInsights = true;
	siteB.materials = materials.map((material) => ({
		...material,
		invoiceNr: "SITE-B-INVOICE",
		supplierName: "Site B supplier",
	}));
	siteB.initialPagination = {
		...siteB.initialPagination,
		spendInsights: {
			supplierTotals: [
				{ key: "site-b", label: "Site B supplier", totalCost: 400, count: 4 },
			],
			monthlyTotals: [],
		},
	};

	render(
		<>
			<div data-testid="retained-site-a" hidden>
				<MaterialsTableClient {...siteA} />
			</div>
			<div data-testid="active-site-b">
				<MaterialsTableClient {...siteB} />
			</div>
		</>,
	);

	const siteARoot = screen.getByTestId("retained-site-a");
	const siteBRoot = screen.getByTestId("active-site-b");
	const siteASupplierInput = siteARoot.querySelector<HTMLInputElement>(
		'input[id="warehouse-supplier-name"]',
	);
	const siteBSupplierInput = siteBRoot.querySelector<HTMLInputElement>(
		'input[id="warehouse-supplier-name"]',
	);
	const siteAInvoiceInput = siteARoot.querySelector<HTMLInputElement>(
		'input[id="warehouse-invoice-number"]',
	);
	const siteBInvoiceInput = siteBRoot.querySelector<HTMLInputElement>(
		'input[id="warehouse-invoice-number"]',
	);

	expect(siteASupplierInput?.list?.id).not.toBe(siteBSupplierInput?.list?.id);
	expect(siteAInvoiceInput?.list?.id).not.toBe(siteBInvoiceInput?.list?.id);
	expect(
		siteBSupplierInput?.list?.querySelector('option[value="Site A supplier"]'),
	).toBeNull();
	expect(
		siteBSupplierInput?.list?.querySelector('option[value="Site B supplier"]'),
	).not.toBeNull();
	expect(
		siteBInvoiceInput?.list?.querySelector('option[value="SITE-A-INVOICE"]'),
	).toBeNull();
	expect(
		siteBInvoiceInput?.list?.querySelector('option[value="SITE-B-INVOICE"]'),
	).not.toBeNull();
});

it("fetches only missing material pages and reuses page one and page two", async () => {
	const input = props();
	const makeRows = (start: number) =>
		Array.from({ length: 50 }, (_, i) => ({
			...materials[0],
			id: "paged-" + (start + i),
			name: "Material " + (start + i),
		}));
	input.materials = makeRows(1);
	input.initialPagination = {
		totalCount: 9809,
		totalCost: 9809,
		page: 1,
		pageSize: 50,
		totalPages: 197,
	};
	const fetchPage = jest.fn(async (_siteId, query) => ({
		...input.initialPagination,
		page: query.page,
		rows: makeRows((query.page - 1) * 50 + 1),
	}));
	input.fetchMaterialsPage = fetchPage;
	render(<MaterialsTableClient {...input} />);
	await waitFor(() =>
		expect(screen.getAllByRole("button", { name: "Next" })[0]).toBeEnabled(),
	);
	expect(fetchPage).not.toHaveBeenCalled();
	expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
		51,
	);
	fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);
	expect(await screen.findByText("Material 51")).toBeInTheDocument();
	expect(fetchPage).toHaveBeenCalledTimes(1);
	expect(fetchPage).toHaveBeenCalledWith(
		"site",
		expect.objectContaining({ page: 2, pageSize: 50 }),
	);
	fireEvent.click(screen.getAllByRole("button", { name: "Previous" })[0]);
	expect(await screen.findByText("Material 1")).toBeInTheDocument();
	fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);
	expect(await screen.findByText("Material 51")).toBeInTheDocument();
	expect(fetchPage).toHaveBeenCalledTimes(1);
	expect(input.exportMaterials).not.toHaveBeenCalled();
});

it("runs material search on the server instead of filtering only the loaded 50 rows", async () => {
	const input = props();
	input.initialPagination = {
		totalCount: 9809,
		totalCost: 9809,
		page: 1,
		pageSize: 50,
		totalPages: 197,
	};
	input.fetchMaterialsPage = jest.fn(async () => ({
		...input.initialPagination,
		totalCount: 1,
		totalPages: 1,
		rows: [
			{ ...materials[0], id: "outside-first-page", name: "Off-page needle" },
		],
	}));
	render(<MaterialsTableClient {...input} />);
	const search = screen.getByPlaceholderText(/Search|Meklēt/i);
	fireEvent.change(search, { target: { value: "needle" } });
	expect(await screen.findByText("Off-page needle")).toBeInTheDocument();
	expect(input.fetchMaterialsPage).toHaveBeenCalledWith(
		"site",
		expect.objectContaining({ search: "needle", page: 1 }),
	);
	expect(input.exportMaterials).not.toHaveBeenCalled();
});

it("allows retrying a failed material page without getting stuck on the requested page", async () => {
	const input = props();
	input.initialPagination = {
		totalCount: 100,
		totalCost: 100,
		page: 1,
		pageSize: 50,
		totalPages: 2,
	};
	const fetchPage = jest
		.fn()
		.mockRejectedValueOnce(new Error("unavailable"))
		.mockResolvedValue({
			...input.initialPagination,
			page: 2,
			rows: [{ ...materials[0], id: "retry", name: "Retried page" }],
		});
	input.fetchMaterialsPage = fetchPage;
	render(<MaterialsTableClient {...input} />);
	await waitFor(() =>
		expect(screen.getAllByRole("button", { name: "Next" })[0]).toBeEnabled(),
	);
	fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);
	await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
	await waitFor(() =>
		expect(screen.getAllByRole("spinbutton", { name: "Page" })[0]).toHaveValue(
			1,
		),
	);
	fireEvent.click(screen.getAllByRole("button", { name: "Next" })[0]);
	expect(await screen.findByText("Retried page")).toBeInTheDocument();
	expect(fetchPage).toHaveBeenCalledTimes(2);
});
