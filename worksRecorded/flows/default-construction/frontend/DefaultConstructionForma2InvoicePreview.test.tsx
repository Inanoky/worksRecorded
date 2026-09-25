import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DefaultConstructionForma2InvoicePreview } from "./DefaultConstructionForma2InvoicePreview";

jest.mock("./DefaultConstructionForma2PdfPreview", () => ({
	DefaultConstructionForma2PdfPreview: ({
		url,
		title,
	}: {
		url: string;
		title: string;
	}) => <div title={`Invoice preview: ${title}`} data-source-url={url} />,
}));

it("shows images inside the panel and clears loading", async () => {
	render(
		<DefaultConstructionForma2InvoicePreview
			url="https://example.com/invoice.jpg"
			title="INV-1"
			isLatvian={false}
			onClose={jest.fn()}
		/>,
	);
	expect(screen.getByRole("status")).toBeInTheDocument();
	fireEvent.load(screen.getByRole("img", { name: "INV-1" }));
	await waitFor(() =>
		expect(screen.queryByRole("status")).not.toBeInTheDocument(),
	);
});

it("falls back to the document viewer for extensionless PDF uploads", () => {
	const onClose = jest.fn();
	render(
		<DefaultConstructionForma2InvoicePreview
			url="https://example.com/file123"
			title="INV-2"
			isLatvian={false}
			onClose={onClose}
		/>,
	);
	fireEvent.error(screen.getByRole("img"));
	const frame = screen.getByTitle("Invoice preview: INV-2");
	expect(frame).toHaveAttribute(
		"data-source-url",
		"https://example.com/file123",
	);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
	expect(onClose).toHaveBeenCalledTimes(1);
});
