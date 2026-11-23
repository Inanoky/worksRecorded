import { fireEvent, render, screen } from "@testing-library/react";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import { TgemDocumentSelector } from "./TgemDocumentSelector";

it("labels the main invoice and supporting receipt and selects either document", () => {
	const onChange = jest.fn();
	const invoice = {
		primaryDocumentId: "invoice",
		documents: [
			{ id: "receipt", originalFilename: "receipt.jpg" },
			{ id: "invoice", originalFilename: "invoice.pdf" },
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
	expect(
		screen.getByRole("option", { name: /receipt.jpg.*Pielikums/ }),
	).toBeInTheDocument();
	expect(
		screen.getByRole("option", { name: /invoice.pdf.*Pamatdokuments/ }),
	).toBeInTheDocument();
	fireEvent.change(
		screen.getByRole("combobox", { name: "Izvēlēties dokumentu" }),
		{ target: { value: "receipt" } },
	);
	expect(onChange).toHaveBeenCalledWith("receipt");
});
