import { fireEvent, render, screen } from "@testing-library/react";
import { SourceDocumentPreview } from "./SourceDocumentPreview";

describe("warehouse source documents", () => {
	it("falls back to a document icon when the source is not an image", () => {
		const { rerender } = render(
			<SourceDocumentPreview
				url="https://example.test/invoice.pdf"
				label="Invoice"
			/>,
		);
		fireEvent.error(screen.getByRole("img", { name: "Invoice" }));
		expect(screen.getByRole("img", { name: "Invoice" }).tagName).toBe("SPAN");
		rerender(
			<SourceDocumentPreview
				url="https://example.test/photo.jpg"
				label="Photo"
			/>,
		);
		expect(screen.getByRole("img", { name: "Photo" }).tagName).toBe("IMG");
	});
});
