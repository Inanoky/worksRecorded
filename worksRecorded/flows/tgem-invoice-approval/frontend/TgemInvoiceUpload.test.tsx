import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockStartSingle = jest.fn();
const mockStartPackage = jest.fn();
const mockSubmit = jest.fn();
const mockStatus = jest.fn();
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: (endpoint: string) => ({
		startUpload:
			endpoint === "tgemInvoicePackageUploader"
				? mockStartPackage
				: mockStartSingle,
	}),
}));
jest.mock("@/server/actions/tgem-invoice-package-actions", () => ({
	submitTgemWebInvoicePackage: (...args: unknown[]) => mockSubmit(...args),
}));
jest.mock("@/server/actions/tgem-invoice-actions", () => ({
	getTgemInvoiceProcessingStatus: (...args: unknown[]) => mockStatus(...args),
}));

import { TgemInvoiceUpload } from "./TgemInvoiceUpload";

describe("TGEM multi-file web upload", () => {
	const files = [
		new File(["invoice"], "invoice.pdf", { type: "application/pdf" }),
		new File(["receipt"], "receipt.jpg", { type: "image/jpeg" }),
	];
	beforeEach(() => {
		jest.resetAllMocks();
		mockStartPackage.mockResolvedValue(
			files.map(() => ({ serverData: { draftId: "draft-1" } })),
		);
		mockSubmit.mockResolvedValue([
			{ invoiceCaseId: "case-1", documentId: "doc-1" },
		]);
		mockStatus.mockResolvedValue({
			status: "needs_review",
			lineItemCount: 1,
			warningCount: 0,
		});
	});
	it.each(["together", "separate"])(
		"submits selected files as %s after uploading every file",
		async (mode) => {
			const onReady = jest.fn();
			const { container } = render(
				<TgemInvoiceUpload
					selectedProjectId="site-1"
					organizationLanguage="lv"
					onInvoiceReady={onReady}
				/>,
			);
			if (mode === "separate")
				fireEvent.click(
					screen.getByRole("radio", {
						name: "Katrs fails ir atsevišķs rēķins",
					}),
				);
			fireEvent.change(
				container.querySelector('input[type="file"]') as HTMLInputElement,
				{ target: { files } },
			);
			await waitFor(() =>
				expect(onReady).toHaveBeenCalledWith("case-1", "site-1"),
			);
			expect(mockStartPackage).toHaveBeenCalledWith(files, {
				siteId: "site-1",
			});
			expect(mockSubmit).toHaveBeenCalledWith({ draftId: "draft-1", mode });
			expect(mockStartSingle).not.toHaveBeenCalled();
		},
	);
	it("retries a saved draft without uploading or creating a new package", async () => {
		mockSubmit.mockRejectedValueOnce(new Error("Please retry"));
		const onReady = jest.fn();
		const { container } = render(
			<TgemInvoiceUpload
				selectedProjectId="site-1"
				organizationLanguage="lv"
				onInvoiceReady={onReady}
			/>,
		);
		fireEvent.change(
			container.querySelector('input[type="file"]') as HTMLInputElement,
			{ target: { files } },
		);
		await screen.findByText("Please retry");
		fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
		await waitFor(() => expect(onReady).toHaveBeenCalled());
		expect(mockStartPackage).toHaveBeenCalledTimes(1);
		expect(mockSubmit).toHaveBeenCalledTimes(2);
	});
	it("does not submit a partially uploaded package", async () => {
		mockStartPackage.mockResolvedValue([
			{ serverData: { draftId: "draft-1" } },
		]);
		const { container } = render(
			<TgemInvoiceUpload
				selectedProjectId="site-1"
				organizationLanguage="lv"
				onInvoiceReady={jest.fn()}
			/>,
		);
		fireEvent.change(
			container.querySelector('input[type="file"]') as HTMLInputElement,
			{ target: { files } },
		);
		await screen.findByText("Rēķinu neizdevās apstrādāt.");
		expect(mockSubmit).not.toHaveBeenCalled();
	});
});
