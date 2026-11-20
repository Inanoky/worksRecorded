import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { VisualPlanningWorkSelect } from "./VisualPlanningWorkSelect";

const options = [
	{ work: "1 P-2.1 STARPSTĀVU PĀRSEGUMS - Šķidrā izolācija", unit: "m2" },
	{ work: "2 P-2.1 STARPSTĀVU PĀRSEGUMS - Betons", unit: "m2" },
	{ work: "PA1.6 - Smilts", unit: "m2" },
];

it("filters estimate sections and shows equally removable works with readable names", () => {
	function Picker() {
		const [value, setValue] = useState([options[0]]);
		return (
			<VisualPlanningWorkSelect
				value={value}
				options={options}
				multiple
				disabled={false}
				onChange={setValue}
			/>
		);
	}
	render(<Picker />);
	fireEvent.click(screen.getByRole("button", { name: "Pievienot darbu" }));
	fireEvent.change(
		screen.getByRole("combobox", { name: "Filtrēt darbu sekciju" }),
		{ target: { value: "P-2.1" } },
	);
	expect(
		screen.queryByRole("checkbox", { name: "PA1.6 - Smilts" }),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("checkbox", { name: options[1].work }));
	fireEvent.click(screen.getByRole("button", { name: "Gatavs" }));
	const list = screen.getByRole("list", { name: "Izvēlētie darbi" });
	expect(within(list).getByText("Šķidrā izolācija")).toBeInTheDocument();
	expect(within(list).getByText("Betons")).toBeInTheDocument();
	fireEvent.click(
		within(list).getByRole("button", {
			name: `Noņemt darbu: ${options[0].work}`,
		}),
	);
	expect(within(list).queryByText("Šķidrā izolācija")).not.toBeInTheDocument();
	expect(screen.getByText("Darbi šajā zonā (1)")).toBeInTheDocument();
});
