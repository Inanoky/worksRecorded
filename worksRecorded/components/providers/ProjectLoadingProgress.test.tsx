import { render, screen } from "@testing-library/react";
import DiaryLoading from "@/app/dashboard/sites/[siteId]/dashboard/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import CalendarLoading from "@/app/dashboard/sites/[siteId]/siteDiary/loading";
import ProjectsLoading from "@/app/dashboard/sites/loading";
import { ProjectLoadingProgressBar } from "./ProjectLoadingProgressBar";
import {
	ProjectLoadingProgressProvider,
	ProjectPreparationScope,
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
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "12.5");
	expect(screen.getByText(/Izpildes zonas/)).toBeInTheDocument();
	view.rerender(content(true, false));
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "25");
	view.rerender(content(true, true));
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "37.5");
	expect(screen.getByText("38%")).toBeInTheDocument();
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
	expect(screen.getByText(/Izpildes zonas/)).toBeInTheDocument();
});
