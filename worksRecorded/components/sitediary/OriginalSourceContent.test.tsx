import { render, screen } from "@testing-library/react";
import { OriginalSourceContent } from "./OriginalSourceContent";

describe("OriginalSourceContent", () => {
	it("keeps the original report visible alongside measured section evidence", () => {
		render(
			<OriginalSourceContent
				originalUserComment="Original worker report"
				sectionMapping={{
					recordRef: "R068",
					section: "PA1.1",
					originalWork: "Screed",
					originalQuantity: 117,
					measuredM2: 113.27,
					boundaryReview: true,
					wallAlignment: { previousM2: 104.5, measuredM2: 113.27 },
					sources: [
						{
							label: "Oriģinālais marķējums",
							url: "https://files.example/original.jpg",
						},
						{ label: "Izmērītā zona", url: "https://files.example/zone.png" },
					],
				}}
			/>,
		);
		expect(screen.getByText("Original worker report")).toBeInTheDocument();
		expect(screen.getByText("Robeža jāpārbauda")).toBeInTheDocument();
		expect(
			screen.getByText(/Robežas piesaistītas rasējuma sienām/),
		).toHaveTextContent("104,5 m²");
		expect(
			screen.getByRole("link", { name: "Oriģinālais marķējums" }),
		).toHaveAttribute("href", "https://files.example/original.jpg");
		expect(screen.getByRole("link", { name: "Izmērītā zona" })).toHaveAttribute(
			"href",
			"https://files.example/zone.png",
		);
	});
	it("renders the original message and playable audio when audio URL exists", () => {
		const { container } = render(
			<OriginalSourceContent
				originalUserComment="Test Worker : poured concrete"
				originalAudioUrl="https://ut.test/voice.ogg"
			/>,
		);

		expect(
			screen.getByText("Test Worker : poured concrete"),
		).toBeInTheDocument();
		expect(screen.getByText("Original voice message")).toBeInTheDocument();

		const audio = container.querySelector("audio");
		expect(audio).toBeInTheDocument();
		expect(audio).toHaveAttribute("controls");
		expect(audio).toHaveAttribute("preload", "metadata");
		expect(audio).toHaveAttribute("src", "https://ut.test/voice.ogg");
	});

	it("does not render an audio control without audio URL", () => {
		const { container } = render(
			<OriginalSourceContent originalUserComment="Text-only message" />,
		);

		expect(screen.getByText("Text-only message")).toBeInTheDocument();
		expect(container.querySelector("audio")).toBeNull();
	});
});
