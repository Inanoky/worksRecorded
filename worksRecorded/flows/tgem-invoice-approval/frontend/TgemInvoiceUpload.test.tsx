import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";

const mockStartSingle = jest.fn();
const mockStartPackage = jest.fn();
const mockSubmit = jest.fn();
const mockStatus = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
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
	const originalCreateObjectURL = URL.createObjectURL;
	const originalRevokeObjectURL = URL.revokeObjectURL;
	beforeAll(() => {
		URL.createObjectURL = mockCreateObjectURL;
		URL.revokeObjectURL = mockRevokeObjectURL;
	});
	afterAll(() => {
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
	});
	const files = [
		new File(["invoice"], "invoice.pdf", { type: "application/pdf" }),
		new File(["receipt"], "receipt.jpg", { type: "image/jpeg" }),
	];
	beforeEach(() => {
		jest.resetAllMocks();
		mockCreateObjectURL.mockImplementation((file: File) => `blob:${file.name}`);
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
	it("previews selected images locally and opens a larger preview without uploading", () => {
		render(
			<TgemInvoiceUpload
				selectedProjectId="site-1"
				onInvoiceReady={jest.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Choose invoice"), {
			target: { files },
		});
		expect(screen.getByRole("img", { name: "receipt.jpg" })).toHaveAttribute(
			"src",
			"blob:receipt.jpg",
		);
		expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
		expect(mockCreateObjectURL).toHaveBeenCalledWith(files[1]);
		fireEvent.click(
			screen.getByRole("button", { name: "Preview image: receipt.jpg" }),
		);
		const dialog = screen.getByRole("dialog", { name: "receipt.jpg" });
		expect(
			within(dialog).getByRole("img", { name: "receipt.jpg" }),
		).toHaveAttribute("src", "blob:receipt.jpg");
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Close preview" }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(mockStartSingle).not.toHaveBeenCalled();
		expect(mockStartPackage).not.toHaveBeenCalled();
		expect(mockSubmit).not.toHaveBeenCalled();
		expect(mockStatus).not.toHaveBeenCalled();
	});
	it("keeps existing thumbnails when adding files and releases previews on removal and unmount", () => {
		const extra = new File(["extra"], "extra.png", { type: "image/png" });
		const { unmount } = render(
			<TgemInvoiceUpload
				selectedProjectId="site-1"
				onInvoiceReady={jest.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Choose invoice"), {
			target: { files: [files[1]] },
		});
		fireEvent.change(screen.getByLabelText("Add files"), {
			target: { files: [extra] },
		});
		expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
		expect(mockRevokeObjectURL).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Remove file: receipt.jpg" }),
		);
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:receipt.jpg");
		expect(mockRevokeObjectURL).not.toHaveBeenCalledWith("blob:extra.png");
		expect(screen.getByRole("img", { name: "extra.png" })).toHaveAttribute(
			"src",
			"blob:extra.png",
		);
		unmount();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:extra.png");
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
			fireEvent.change(
				container.querySelector('input[type="file"]') as HTMLInputElement,
				{ target: { files } },
			);
			expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
			expect(screen.getByText("receipt.jpg")).toBeInTheDocument();
			expect(mockStartPackage).not.toHaveBeenCalled();
			expect(mockStartSingle).not.toHaveBeenCalled();
			expect(mockSubmit).not.toHaveBeenCalled();
			if (mode === "separate")
				fireEvent.click(
					screen.getByRole("radio", {
						name: "Katrs fails ir atsevišķs rēķins",
					}),
				);
			fireEvent.click(screen.getByRole("button", { name: "Augšupielādēt" }));
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
		fireEvent.click(screen.getByRole("button", { name: "Augšupielādēt" }));
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
		fireEvent.click(screen.getByRole("button", { name: "Augšupielādēt" }));
		await screen.findByText("Rēķinu neizdevās apstrādāt.");
		expect(mockSubmit).not.toHaveBeenCalled();
	});
	it("stages a single file until the user explicitly uploads it", async () => {
		mockStartSingle.mockResolvedValue([
			{ serverData: { invoiceCaseId: "case-1", documentId: "doc-1" } },
		]);
		const onReady = jest.fn();
		render(
			<TgemInvoiceUpload selectedProjectId="site-1" onInvoiceReady={onReady} />,
		);
		expect(screen.queryByRole("radio")).not.toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Choose invoice"), {
			target: { files: [files[0]] },
		});
		expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
		expect(screen.queryByRole("radio")).not.toBeInTheDocument();
		expect(mockStartSingle).not.toHaveBeenCalled();
		expect(mockStatus).not.toHaveBeenCalled();
		expect(onReady).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Upload" }));
		await waitFor(() =>
			expect(onReady).toHaveBeenCalledWith("case-1", "site-1"),
		);
		expect(mockStartSingle).toHaveBeenCalledTimes(1);
		expect(mockStartSingle).toHaveBeenCalledWith([files[0]], {
			siteId: "site-1",
		});
		expect(mockStartPackage).not.toHaveBeenCalled();
	});
	it("adds, deduplicates, and removes staged files before submission", async () => {
		const extra = new File(["extra"], "extra.png", { type: "image/png" });
		const onReady = jest.fn();
		render(
			<TgemInvoiceUpload selectedProjectId="site-1" onInvoiceReady={onReady} />,
		);
		fireEvent.change(screen.getByLabelText("Choose invoice"), {
			target: { files: [files[0]] },
		});
		fireEvent.change(screen.getByLabelText("Add files"), {
			target: { files: [files[0], files[1], extra] },
		});
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		fireEvent.click(
			screen.getByRole("button", { name: "Remove file: extra.png" }),
		);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(mockStartPackage).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Upload" }));
		await waitFor(() => expect(onReady).toHaveBeenCalled());
		expect(mockStartPackage).toHaveBeenCalledWith(files, { siteId: "site-1" });
	});
	it("returns to file selection when the last staged file is removed", () => {
		render(
			<TgemInvoiceUpload
				selectedProjectId="site-1"
				onInvoiceReady={jest.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Choose invoice"), {
			target: { files: [files[0]] },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Remove file: invoice.pdf" }),
		);
		expect(screen.getByLabelText("Choose invoice")).toBeEnabled();
		expect(
			screen.queryByRole("button", { name: "Upload" }),
		).not.toBeInTheDocument();
		expect(mockStartSingle).not.toHaveBeenCalled();
	});
	it("stages dropped files and lets the user choose separate processing afterward", async () => {
		const onReady = jest.fn();
		render(
			<TgemInvoiceUpload selectedProjectId="site-1" onInvoiceReady={onReady} />,
		);
		fireEvent.drop(screen.getByRole("region", { name: "Upload invoice" }), {
			dataTransfer: { files },
		});
		expect(mockStartPackage).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("radio", { name: "Each file is a separate invoice" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Upload" }));
		await waitFor(() => expect(onReady).toHaveBeenCalled());
		expect(mockSubmit).toHaveBeenCalledWith({
			draftId: "draft-1",
			mode: "separate",
		});
	});
	it.each(["type", "count", "file size", "total size"])(
		"rejects an invalid %s without discarding the staged files or uploading",
		(limit) => {
			render(
				<TgemInvoiceUpload
					selectedProjectId="site-1"
					onInvoiceReady={jest.fn()}
				/>,
			);
			fireEvent.change(screen.getByLabelText("Choose invoice"), {
				target: { files: [files[0]] },
			});
			const incoming =
				limit === "count"
					? Array.from(
							{ length: 10 },
							(_, index) =>
								new File(["extra"], `extra-${index}.pdf`, {
									type: "application/pdf",
								}),
						)
					: [
							new File(["extra"], "extra.pdf", {
								type: limit === "type" ? "text/plain" : "application/pdf",
							}),
						];
			if (limit === "file size")
				Object.defineProperty(incoming[0], "size", { value: 17 * 1024 * 1024 });
			if (limit === "total size") {
				Object.defineProperty(incoming[0], "size", { value: 16 * 1024 * 1024 });
				const more = new File(["more"], "more.pdf", {
					type: "application/pdf",
				});
				Object.defineProperty(more, "size", { value: 16 * 1024 * 1024 });
				incoming.push(more);
			}
			fireEvent.change(screen.getByLabelText("Add files"), {
				target: { files: incoming },
			});
			expect(screen.getByRole("alert")).toHaveTextContent(
				limit === "type" ? "Choose a PDF" : "Up to 10 files",
			);
			expect(screen.getAllByRole("listitem")).toHaveLength(1);
			expect(mockStartSingle).not.toHaveBeenCalled();
			expect(mockStartPackage).not.toHaveBeenCalled();
		},
	);
});
