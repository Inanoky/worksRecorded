import { fireEvent, render, screen } from "@testing-library/react";
import { VisualFeedbackPanel } from "./VisualFeedbackPanel";

it("closes the whole analysis panel and keeps it closed through background updates", () => {
	const view = render(
		<VisualFeedbackPanel visible>
			<p role="alert">Analīze pārtraukta</p>
		</VisualFeedbackPanel>,
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Aizvērt analīzes paziņojumus" }),
	);
	expect(
		screen.queryByRole("region", { name: "Analīzes paziņojumi" }),
	).not.toBeInTheDocument();
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	view.rerender(
		<VisualFeedbackPanel visible>
			<p role="alert">Atjaunots progresa statuss</p>
		</VisualFeedbackPanel>,
	);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	view.rerender(
		<VisualFeedbackPanel visible={false}>Atjauno…</VisualFeedbackPanel>,
	);
	view.rerender(
		<VisualFeedbackPanel visible>
			<p role="alert">Analīze pārtraukta</p>
		</VisualFeedbackPanel>,
	);
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Rādīt analīzes paziņojumus" }),
	);
	expect(screen.getByRole("alert")).toHaveTextContent("Analīze pārtraukta");
});

it("allows keyboard dismissal and opens again for a new analysis run", () => {
	const view = render(
		<VisualFeedbackPanel key="run-1" visible>
			Analizē attēlus…
		</VisualFeedbackPanel>,
	);
	fireEvent.keyDown(
		screen.getByRole("button", { name: "Aizvērt analīzes paziņojumus" }),
		{ key: "Escape" },
	);
	expect(screen.queryByRole("region")).not.toBeInTheDocument();
	view.rerender(
		<VisualFeedbackPanel key="run-2" visible>
			Jauna analīze
		</VisualFeedbackPanel>,
	);
	expect(screen.getByRole("region")).toHaveTextContent("Jauna analīze");
});
