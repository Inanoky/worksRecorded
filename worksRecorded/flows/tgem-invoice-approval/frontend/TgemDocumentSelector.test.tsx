import { fireEvent, render, screen, within } from "@testing-library/react";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import { TgemDocumentSelector } from "./TgemDocumentSelector";

it("lists every document equally and opens a selected document", () => {
	const onChange = jest.fn();
	const invoice = {
		primaryDocumentId: "invoice",
		documents: [
			{
				id: "receipt",
				contentType: "image/jpeg",
				originalFilename: "receipt.jpg",
			},
			{
				id: "invoice",
				contentType: "application/pdf",
				originalFilename: "invoice.pdf",
			},
		],
	} as TgemDashboardInvoice;
	render(
		<TgemDocumentSelector
			invoice={invoice}
			selectedId="invoice"
			onChange={onChange}
			language="lv"
		/>,
	);
	const list = within(screen.getByRole("list", { name: "Dokumenti" }));
	expect(list.getAllByRole("listitem")).toHaveLength(2);
	expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	expect(
		screen.queryByText(/Pielikums|Pamatdokuments/),
	).not.toBeInTheDocument();
	expect(list.getByRole("button", { name: /invoice.pdf/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	fireEvent.click(list.getByRole("button", { name: /receipt.jpg/ }));
	expect(onChange).toHaveBeenCalledWith("receipt");
});
