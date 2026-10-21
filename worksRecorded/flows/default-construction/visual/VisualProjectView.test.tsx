import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { getProjectNavLinks } from "@/components/dashboard/NavLinks";
import {
	ProjectLoadingProgressProvider,
	useProjectPreparationReporter,
} from "@/components/providers/ProjectLoadingProgressProvider";

let mockPathname = "/dashboard/sites/site/dashboard";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

import { VisualProjectView } from "./VisualProjectView";

const mockMount = jest.fn();
const mockUnmount = jest.fn();

jest.mock("./VisualView", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: function View({ siteId }: { siteId: string }) {
			const [location, setLocation] = React.useState("");
			React.useEffect(() => {
				mockMount(siteId);
				return () => mockUnmount(siteId);
			}, [siteId]);
			return (
				<input
					aria-label="Location"
					value={location}
					onChange={(event) => setLocation(event.target.value)}
				/>
			);
		},
	};
});

function Diary({
	active,
	siteId = "site",
}: {
	active: boolean;
	siteId?: string;
}) {
	mockPathname = `/dashboard/sites/${siteId}/${active ? "izpildshemas" : "BIS"}`;
	return (
		<VisualProjectView key={siteId} siteId={siteId}>
			<div>Noliktava</div>
		</VisualProjectView>
	);
}

beforeEach(() => jest.clearAllMocks());

it("loads only on the first visit and preserves location without remounting when visiting Noliktava and returning", async () => {
	const { rerender } = render(<Diary active={false} />);
	expect(mockMount).not.toHaveBeenCalled();
	expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
	rerender(<Diary active />);
	const input = await screen.findByLabelText("Location");
	fireEvent.change(input, { target: { value: "2. stāvs" } });
	rerender(<Diary active={false} />);
	expect(input).not.toBeVisible();
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(mockUnmount).not.toHaveBeenCalled();
	rerender(<Diary active />);
	expect(screen.getByRole("textbox")).toBe(input);
	expect(input).toHaveValue("2. stāvs");
	expect(input).toBeVisible();
	expect(mockMount).toHaveBeenCalledTimes(1);
});

it("discards the previous project's view when the project changes", async () => {
	const { rerender } = render(<Diary active />);
	fireEvent.change(await screen.findByLabelText("Location"), {
		target: { value: "2. stāvs" },
	});
	rerender(<Diary active={false} siteId="other" />);
	expect(mockUnmount).toHaveBeenCalledWith("site");
	expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
	rerender(<Diary active siteId="other" />);
	expect(await screen.findByLabelText("Location")).toHaveValue("");
	expect(mockMount).toHaveBeenLastCalledWith("other");
});

it("offers Izpildshēmas only when enabled for the project", () => {
	expect(
		getProjectNavLinks("lv").some((item) => item.path === "izpildshemas"),
	).toBe(false);
	expect(
		getProjectNavLinks("lv", { showVisual: true }).find(
			(item) => item.path === "izpildshemas",
		)?.name,
	).toBe("Izpildshēmas");
});

it("preloads Limeni's hidden view when opening a project and reuses it on the first visit", async () => {
	const view = render(
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<Diary active={false} />
		</ProjectLoadingProgressProvider>,
	);
	const input = await screen.findByLabelText("Location");
	expect(input).not.toBeVisible();
	expect(mockMount).toHaveBeenCalledTimes(1);
	view.rerender(
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<Diary active />
		</ProjectLoadingProgressProvider>,
	);
	const report = screen.queryByRole("status", { name: "Sagatavo projektu…" });
	expect(report).toBeInTheDocument();
	expect(screen.getByLabelText("Location")).toBe(input);
	expect(mockMount).toHaveBeenCalledTimes(1);
});

function CompletePreparation({
	ready,
	failed = false,
}: {
	ready: boolean;
	failed?: boolean;
}) {
	const report = useProjectPreparationReporter("site");
	useEffect(() => {
		for (const step of [
			"settings",
			"diary",
			"visual-module",
			"visual-index",
			"visual-drawing",
			"visual-planning",
		])
			report(step);
		if (ready) report("visual-preview", failed ? "error" : "done");
	}, [report, ready, failed]);
	return <div>Project content</div>;
}

it("keeps the project blocked until all resources finish and does not block section switches again", async () => {
	mockPathname = "/dashboard/sites/site/dashboard";
	const content = (ready: boolean) => (
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<VisualProjectView siteId="site">
				<CompletePreparation ready={ready} />
			</VisualProjectView>
		</ProjectLoadingProgressProvider>
	);
	const view = render(content(false));
	expect(
		await screen.findByRole("status", { name: "Sagatavo projektu…" }),
	).toBeInTheDocument();
	expect(screen.getByText("Project content").parentElement).toHaveAttribute(
		"inert",
	);
	view.rerender(content(true));
	await waitFor(() =>
		expect(
			screen.queryByRole("status", { name: "Sagatavo projektu…" }),
		).not.toBeInTheDocument(),
	);
	mockPathname = "/dashboard/sites/site/izpildshemas";
	view.rerender(content(true));
	expect(
		screen.queryByRole("status", { name: "Sagatavo projektu…" }),
	).not.toBeInTheDocument();
});

it("offers retry or an explicit partial opening when a preload fails", async () => {
	mockPathname = "/dashboard/sites/site/dashboard";
	render(
		<ProjectLoadingProgressProvider enabled visualPreloadEnabled>
			<VisualProjectView siteId="site">
				<CompletePreparation ready failed />
			</VisualProjectView>
		</ProjectLoadingProgressProvider>,
	);
	expect(
		await screen.findByRole("button", { name: "Mēģināt vēlreiz" }),
	).toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Atvērt ar pieejamajiem datiem" }),
	);
	expect(
		screen.queryByRole("status", { name: "Sagatavo projektu…" }),
	).not.toBeInTheDocument();
});

it("preloads only eligible projects for an administrator visiting multiple organizations", async () => {
	const view = render(
		<ProjectLoadingProgressProvider
			enabled={false}
			visualPreloadSites={["limeni-site"]}
		>
			<Diary active={false} siteId="another-company" />
		</ProjectLoadingProgressProvider>,
	);
	expect(mockMount).not.toHaveBeenCalled();
	view.rerender(
		<ProjectLoadingProgressProvider
			enabled={false}
			visualPreloadSites={["limeni-site"]}
		>
			<Diary active={false} siteId="limeni-site" />
		</ProjectLoadingProgressProvider>,
	);
	expect(await screen.findByLabelText("Location")).not.toBeVisible();
	expect(mockMount).toHaveBeenCalledWith("limeni-site");
});
