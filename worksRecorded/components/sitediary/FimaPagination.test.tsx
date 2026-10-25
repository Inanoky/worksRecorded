import { fireEvent, render, screen } from "@testing-library/react";
import { FimaPagination } from "./FimaPagination";

it("jumps directly to a distant page only after submission", () => {
	const onPageChange = jest.fn();
	render(
		<FimaPagination
			page={1}
			totalPages={52}
			summary="Records"
			onPageChange={onPageChange}
		/>,
	);
	const input = screen.getByRole("spinbutton", { name: "Uz lapu" });
	fireEvent.change(input, { target: { value: "15" } });
	expect(onPageChange).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Iet" }));
	expect(onPageChange).toHaveBeenCalledTimes(1);
	expect(onPageChange).toHaveBeenCalledWith(15);
});

it("shows nearby pages, first and last pages, and ellipses without listing every page", () => {
	const onPageChange = jest.fn();
	render(
		<FimaPagination
			page={15}
			totalPages={52}
			summary="Records"
			onPageChange={onPageChange}
		/>,
	);
	for (const number of [1, 13, 14, 15, 16, 17, 52])
		expect(
			screen.getByRole("button", { name: `Lapa ${number}` }),
		).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Lapa 15" })).toHaveAttribute(
		"aria-current",
		"page",
	);
	expect(screen.getAllByText("…")).toHaveLength(2);
	expect(
		screen.queryByRole("button", { name: "Lapa 9" }),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Lapa 52" }));
	fireEvent.click(screen.getByRole("button", { name: "Lapa 1" }));
	expect(onPageChange.mock.calls).toEqual([[52], [1]]);
});

it.each(["", "0", "-1", "53", "1.5", "1"])(
	"does not navigate for invalid or current page %s",
	(value) => {
		const onPageChange = jest.fn();
		render(
			<FimaPagination
				page={1}
				totalPages={52}
				summary="Records"
				onPageChange={onPageChange}
			/>,
		);
		const input = screen.getByRole("spinbutton", { name: "Uz lapu" });
		fireEvent.change(input, { target: { value } });
		expect(screen.getByRole("button", { name: "Iet" })).toBeDisabled();
		fireEvent.submit(input.closest("form") as HTMLFormElement);
		expect(onPageChange).not.toHaveBeenCalled();
	},
);

it("disables navigation during loading and synchronizes the page field after navigation or filtering", () => {
	const onPageChange = jest.fn();
	const { rerender } = render(
		<FimaPagination
			page={15}
			totalPages={52}
			summary="Records"
			onPageChange={onPageChange}
			disabled
		/>,
	);
	for (const button of screen.getAllByRole("button"))
		expect(button).toBeDisabled();
	expect(screen.getByRole("spinbutton", { name: "Uz lapu" })).toBeDisabled();
	rerender(
		<FimaPagination
			page={16}
			totalPages={52}
			summary="Records"
			onPageChange={onPageChange}
		/>,
	);
	expect(screen.getByRole("spinbutton", { name: "Uz lapu" })).toHaveValue(16);
	fireEvent.change(screen.getByRole("spinbutton", { name: "Uz lapu" }), {
		target: { value: "50" },
	});
	rerender(
		<FimaPagination
			page={1}
			totalPages={2}
			summary="Records"
			onPageChange={onPageChange}
		/>,
	);
	expect(screen.getByRole("spinbutton", { name: "Uz lapu" })).toHaveValue(1);
	expect(screen.getByRole("button", { name: "Iepriekšējā" })).toBeDisabled();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā" }));
	expect(onPageChange).toHaveBeenCalledWith(2);
});

it("supports English labels and a single page without duplicate page buttons", () => {
	render(
		<FimaPagination
			page={1}
			totalPages={1}
			summary="Records"
			onPageChange={jest.fn()}
			language="en"
		/>,
	);
	expect(screen.getByRole("spinbutton", { name: "Go to page" })).toHaveValue(1);
	expect(screen.getAllByRole("button", { name: "Page 1" })).toHaveLength(1);
	expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
	expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
