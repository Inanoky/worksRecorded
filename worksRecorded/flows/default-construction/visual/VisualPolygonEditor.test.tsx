import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { VisualPolygonEditor } from "./VisualPolygonEditor";

it("keeps corner identities and controls intact when the parent rejects adding or deleting a vertex", () => {
	const onChange = jest.fn(() => false);
	render(
		<VisualPolygonEditor
			area={{
				id: "part",
				page: 1,
				polygon: [
					{ x: 0.1, y: 0.1 },
					{ x: 0.8, y: 0.1 },
					{ x: 0.8, y: 0.8 },
					{ x: 0.1, y: 0.8 },
				],
			}}
			surface={createRef()}
			onChange={onChange}
		/>,
	);
	const corner = screen.getByRole("button", { name: "Stūris 2" });
	corner.focus();
	fireEvent.keyDown(corner, { key: "Delete" });
	expect(screen.getAllByRole("button", { name: /^Stūris \d+$/ })).toHaveLength(
		4,
	);
	expect(corner).toHaveFocus();
	fireEvent.click(
		screen.getByRole("button", { name: "Pievienot stūri pie malas 1" }),
	);
	expect(screen.getAllByRole("button", { name: /^Stūris \d+$/ })).toHaveLength(
		4,
	);
	expect(screen.getByRole("button", { name: "Stūris 2" })).toBe(corner);
	expect(onChange).toHaveBeenCalledTimes(2);
});
