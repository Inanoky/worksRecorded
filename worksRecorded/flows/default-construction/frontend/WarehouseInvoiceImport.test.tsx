import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { WarehouseInvoiceImport } from "./WarehouseInvoiceImport";
import { importWarehouseInvoice } from "./warehouse-import-client";

const mockUpload = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({ startUpload: mockUpload }),
}));
jest.mock("./warehouse-import-client", () => ({
	importWarehouseInvoice: jest.fn(),
}));

describe("warehouse invoice batch import", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockUpload.mockImplementation(async (files: File[]) =>
			files.map((file) => ({
				name: file.name,
				ufsUrl: `https://example.test/${file.name}`,
				serverData: { receipt: file.name },
			})),
		);
		jest
			.mocked(importWarehouseInvoice)
			.mockResolvedValue({ ok: true, count: 2, duplicate: false });
	});

	it("imports 20 mixed documents and displays a result for every document", async () => {
		render(
			<WarehouseInvoiceImport siteId="site-1" organizationLanguage="en" />,
		);
		const files = Array.from(
			{ length: 20 },
			(_, i) =>
				new File(["document"], `${i}.${i % 2 ? "jpg" : "pdf"}`, {
					type: i % 2 ? "image/jpeg" : "application/pdf",
				}),
		);
		fireEvent.change(screen.getByLabelText("Choose documents"), {
			target: { files },
		});
		fireEvent.click(screen.getByRole("button", { name: "Import" }));
		await waitFor(() =>
			expect(importWarehouseInvoice).toHaveBeenCalledTimes(20),
		);
		expect(mockUpload).toHaveBeenCalledWith(files, { siteId: "site-1" });
		expect(await screen.findByText("20/20 imported")).toBeInTheDocument();
		expect(screen.getAllByText("Imported · 2 line items")).toHaveLength(20);
		expect(mockRefresh).toHaveBeenCalled();
	});

	it("starts every document before any finishes and handles out-of-order failure independently", async () => {
		type Result = Awaited<ReturnType<typeof importWarehouseInvoice>>;
		const finish: Array<(result: Result) => void> = [];
		const fail: Array<(error: Error) => void> = [];
		jest.mocked(importWarehouseInvoice).mockImplementation(
			() =>
				new Promise<Result>((resolve, reject) => {
					finish.push(resolve);
					fail.push(reject);
				}),
		);
		render(
			<WarehouseInvoiceImport siteId="site-1" organizationLanguage="en" />,
		);
		fireEvent.change(screen.getByLabelText("Choose documents"), {
			target: {
				files: Array.from(
					{ length: 20 },
					(_, i) => new File(["pdf"], `${i}.pdf`, { type: "application/pdf" }),
				),
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Import" }));
		await waitFor(() =>
			expect(importWarehouseInvoice).toHaveBeenCalledTimes(20),
		);
		expect(mockRefresh).not.toHaveBeenCalled();
		await act(async () => {
			finish[19]({ ok: true, count: 1, duplicate: false });
			fail[0](new Error("Network error"));
		});
		expect(screen.getByText(/1\/20 imported/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry failed" })).toBeDisabled();
		await act(async () => {
			finish.slice(1, 19).forEach((resolve) => {
				resolve({ ok: true, count: 1, duplicate: false });
			});
		});
		expect(screen.getByText("19/20 imported")).toBeInTheDocument();
		expect(mockRefresh).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button", { name: "Retry failed" })).toBeEnabled();
	});

	it("rejects more than 20 files without uploading", () => {
		render(
			<WarehouseInvoiceImport siteId="site-1" organizationLanguage="en" />,
		);
		fireEvent.change(screen.getByLabelText("Choose documents"), {
			target: {
				files: Array.from(
					{ length: 21 },
					() => new File(["pdf"], "invoice.pdf", { type: "application/pdf" }),
				),
			},
		});
		expect(screen.getByRole("alert")).toHaveTextContent("between 1 and 20");
		expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
		expect(mockUpload).not.toHaveBeenCalled();
	});

	it("continues after one failure and retries only the failed document without re-uploading", async () => {
		jest
			.mocked(importWarehouseInvoice)
			.mockResolvedValueOnce({ ok: false, error: "processing" })
			.mockResolvedValueOnce({ ok: true, count: 1, duplicate: false });
		render(
			<WarehouseInvoiceImport siteId="site-1" organizationLanguage="en" />,
		);
		fireEvent.change(screen.getByLabelText("Choose documents"), {
			target: {
				files: [
					new File(["a"], "a.pdf", { type: "application/pdf" }),
					new File(["b"], "b.pdf", { type: "application/pdf" }),
				],
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Import" }));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Retry failed" }),
			).toBeEnabled(),
		);
		expect(importWarehouseInvoice).toHaveBeenCalledTimes(2);
		fireEvent.click(screen.getByRole("button", { name: "Retry failed" }));
		await waitFor(() =>
			expect(screen.getByText("2/2 imported")).toBeInTheDocument(),
		);
		expect(importWarehouseInvoice).toHaveBeenCalledTimes(3);
		expect(importWarehouseInvoice).toHaveBeenLastCalledWith("a.pdf");
		expect(mockUpload).toHaveBeenCalledTimes(1);
	});
});
