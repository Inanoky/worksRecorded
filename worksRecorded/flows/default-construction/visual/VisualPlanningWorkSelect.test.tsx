import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { VisualPlanningWorkSelect } from "./VisualPlanningWorkSelect";

const options = [
	{ work: "1 P-2.1 STARPSTĀVU PĀRSEGUMS - Šķidrā izolācija", unit: "m2" },
	{ work: "2 P-2.1 STARPSTĀVU PĀRSEGUMS - Betons", unit: "m2" },
	{ work: "PA1.6 - Smilts", unit: "m2" },
];

it("filters estimate sections and preserves full names for removable works", () => {
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
	expect(within(list).getByText(options[0].work)).toBeInTheDocument();
	expect(within(list).getByText(options[1].work)).toBeInTheDocument();
	fireEvent.click(
		within(list).getByRole("button", {
			name: `Noņemt darbu: ${options[0].work}`,
		}),
	);
	expect(within(list).queryByText(options[0].work)).not.toBeInTheDocument();
	expect(screen.getByText("Darbi šajā zonā (1)")).toBeInTheDocument();
});

it("distinguishes repeated work descriptions by their summary prefixes in the picker and selected list", () => {
	const repeatedWorks = [
		{
			work: "11 Atjaunojamā grīda uz grunts 1.stāva. - Polietilēna plēve, 200 µ",
			unit: "m2",
		},
		{
			work: "11 Atjaunojamā grīda uz grunts pagrabstāvā - Polietilēna plēve, 200 µ",
			unit: "m2",
		},
	];
	function Picker() {
		const [value, setValue] = useState<typeof repeatedWorks>([]);
		return (
			<VisualPlanningWorkSelect
				value={value}
				options={repeatedWorks}
				multiple
				disabled={false}
				onChange={setValue}
			/>
		);
	}
	render(<Picker />);
	fireEvent.click(screen.getByRole("button", { name: "Pievienot darbu" }));
	for (const option of repeatedWorks) {
		expect(screen.getByText(option.work, { exact: true })).toBeVisible();
	}
	expect(
		screen.queryByText("Polietilēna plēve, 200 µ", { exact: true }),
	).not.toBeInTheDocument();
	fireEvent.change(screen.getByRole("textbox", { name: "Meklēt darbus" }), {
		target: { value: "pagrabstāvā" },
	});
	expect(
		screen.queryByRole("checkbox", { name: repeatedWorks[0].work }),
	).not.toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("checkbox", { name: repeatedWorks[1].work }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Gatavs" }));
	expect(
		within(screen.getByRole("list", { name: "Izvēlētie darbi" })).getByText(
			repeatedWorks[1].work,
		),
	).toBeVisible();
});
