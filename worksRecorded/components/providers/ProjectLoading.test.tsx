import { render, screen } from "@testing-library/react";
import DiaryLoading from "@/app/dashboard/sites/[siteId]/dashboard/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import CalendarLoading from "@/app/dashboard/sites/[siteId]/siteDiary/loading";
import ProjectsLoading from "@/app/dashboard/sites/loading";

let ready = false;
jest.mock("@/flows/default-construction/frontend/RetainedLimeniDiary", () => ({
	useRetainedDiaryReady: () => ready,
}));
beforeEach(() => {
	ready = false;
});
it.each([ProjectLoading, ProjectsLoading])(
	"shows a project loading screen",
	(Component) => {
		render(<Component />);
		expect(
			screen.getByRole("status", { name: "Ielādē projektu…" }),
		).toBeInTheDocument();
	},
);
it.each([DiaryLoading, CalendarLoading])(
	"shows a diary loading screen",
	(Component) => {
		render(<Component />);
		expect(
			screen.getByRole("status", { name: "Ielādē būvdarbu žurnālu…" }),
		).toBeInTheDocument();
	},
);
it.each([ProjectLoading, DiaryLoading])(
	"does not cover a retained diary that is already ready",
	(Component) => {
		ready = true;
		render(<Component />);
		expect(screen.queryByRole("status")).toBeNull();
	},
);
