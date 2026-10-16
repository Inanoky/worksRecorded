import { render, screen } from "@testing-library/react";
import DiaryLoading from "@/app/dashboard/sites/[siteId]/dashboard/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import CalendarLoading from "@/app/dashboard/sites/[siteId]/siteDiary/loading";
import ProjectsLoading from "@/app/dashboard/sites/loading";
import { ProjectLoadingProgressBar } from "./ProjectLoadingProgressBar";
import { ProjectLoadingProgressProvider } from "./ProjectLoadingProgressProvider";
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
		expect(screen.getByRole("progressbar")).not.toHaveAttribute("value");
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
