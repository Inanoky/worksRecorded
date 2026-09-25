import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import MaterialsTableClient from "@/app/dashboard/sites/[siteId]/BIS/Components/materials-table-client";

jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	UploadButton: () => null,
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
		initialPagination: {
			totalCount: 4,
			totalCost: 400,
			page: 1,
			pageSize: 30,
			totalPages: 1,
		},
		fetchMaterials: jest.fn(),
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
	expect(input.fetchMaterials).not.toHaveBeenCalled();
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
