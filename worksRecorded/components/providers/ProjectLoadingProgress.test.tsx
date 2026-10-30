import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import DiaryLoading from "@/app/dashboard/sites/[siteId]/dashboard/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import CalendarLoading from "@/app/dashboard/sites/[siteId]/siteDiary/loading";
import ProjectsLoading from "@/app/dashboard/sites/loading";
import { ProjectLoadingProgressBar } from "./ProjectLoadingProgressBar";
import {
	ProjectLoadingProgressProvider,
	ProjectPreparationScope,
	useProjectPreparationReporter,
	useProjectPreparationStep,
} from "./ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "./ProjectOpeningOverlay";

jest.mock("@/flows/default-construction/frontend/RetainedLimeniDiary", () => ({
	useRetainedDiaryReady: () => false,
}));

it.each([ProjectLoading, ProjectsLoading, DiaryLoading, CalendarLoading])(
	"shows progress on existing default-construction project and diary loading screens",
	(Component) => {
		render(
			<ProjectLoadingProgressProvider enabled>
				<Component />
			</ProjectLoadingProgressProvider>,
		);
		expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
		expect(screen.getByText("0%")).toBeInTheDocument();
		expect(screen.getByText(/Projekta datu ielāde/)).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toHaveAttribute("max", "100");
	},
);
it("keeps the existing loading state for other flows without adding a progress bar", () => {
	const { rerender } = render(
		<ProjectLoadingProgressProvider enabled>
			<ProjectOpeningOverlay label="Loading project" />
		</ProjectLoadingProgressProvider>,
	);
	expect(screen.getByRole("progressbar")).toBeInTheDocument();
	rerender(
		<ProjectLoadingProgressProvider enabled={false}>
			<ProjectOpeningOverlay label="Loading project" />
		</ProjectLoadingProgressProvider>,
	);
	expect(
		screen.getByRole("status", { name: "Loading project" }),
	).toBeInTheDocument();
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
it("uses real progress counts and never substitutes a timer-based percentage", () => {
	const { rerender } = render(
		<ProjectLoadingProgressBar
			label="Photos"
			progress={{ completed: 2, total: 8 }}
		/>,
	);
	expect(screen.getByRole("progressbar", { name: "Photos" })).toHaveAttribute(
		"value",
		"25",
	);
	rerender(
		<ProjectLoadingProgressBar
			label="Photos"
			progress={{ completed: 8, total: 8 }}
		/>,
	);
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
});
it.each([
	{ completed: 1, total: 0 },
	{ completed: Number.NaN, total: 10 },
])("keeps progress indeterminate for invalid totals", (progress) => {
	render(<ProjectLoadingProgressBar label="Loading" progress={progress} />);
	expect(screen.getByRole("progressbar")).not.toHaveAttribute("value");
});

function PreparationSteps({
	settings,
	diary,
}: {
	settings: boolean;
	diary: boolean;
}) {
	useProjectPreparationStep("site", "project", true);
	useProjectPreparationStep("site", "settings", settings);
	useProjectPreparationStep("site", "diary", diary);
	return <ProjectOpeningOverlay label="Projekta ielāde" />;
}

it("shows the real project stages and updates percentages when work completes", () => {
	const content = (settings: boolean, diary: boolean) => (
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<ProjectPreparationScope siteId="site">
				<PreparationSteps settings={settings} diary={diary} />
			</ProjectPreparationScope>
		</ProjectLoadingProgressProvider>
	);
	const view = render(content(false, false));
	expect(screen.getByRole("progressbar")).toHaveAttribute(
		"value",
		String(100 / 9),
	);
	expect(screen.queryByText(/Izpildes zonas/)).not.toBeInTheDocument();
	view.rerender(content(true, false));
	expect(screen.getByRole("progressbar")).toHaveAttribute(
		"value",
		String(200 / 9),
	);
	view.rerender(content(true, true));
	expect(screen.getByRole("progressbar")).toHaveAttribute(
		"value",
		String((3 / 9) * 100),
	);
	expect(screen.getByText("33%")).toBeInTheDocument();
});

it("shows Limeni loading stages to an administrator without enabling them for other projects", () => {
	const content = (siteId: string) => (
		<ProjectLoadingProgressProvider
			enabled={false}
			visualPreloadSites={["limeni"]}
		>
			<ProjectOpeningOverlay label="Loading" siteId={siteId} />
		</ProjectLoadingProgressProvider>
	);
	const view = render(content("other"));
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	view.rerender(content("limeni"));
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
	expect(screen.queryByText(/Izpildes zonas/)).not.toBeInTheDocument();
});
it("includes Acts preparation only in FIMA project progress", () => {
	const content = (siteId: string) => (
		<ProjectLoadingProgressProvider enabled fimaActPreloadSites={["fima"]}>
			<ProjectOpeningOverlay label="Loading" siteId={siteId} />
		</ProjectLoadingProgressProvider>
	);
	const view = render(content("fima"));
	expect(screen.getByText(/Akti un paraugi/)).toBeInTheDocument();
	view.rerender(content("ordinary"));
	expect(screen.queryByText(/Akti un paraugi/)).not.toBeInTheDocument();
});

it("reports partial floor preparation without marking the whole stage ready", () => {
	function Floors() {
		const report = useProjectPreparationReporter("site");
		useEffect(() => {
			report("visual-preview", "pending", { completed: 1, total: 4 });
		}, [report]);
		return <ProjectOpeningOverlay label="Loading floors" siteId="site" />;
	}
	render(
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<Floors />
		</ProjectLoadingProgressProvider>,
	);
	expect(screen.getByRole("progressbar")).toHaveAttribute(
		"value",
		String((0.25 / 9) * 100),
	);
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
