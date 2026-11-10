import { act, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { prefetchConstructionProjectBootstrap } from "@/flows/default-construction/visual/project-sync-client";
import { DEMO_SITE_ID } from "@/flows/demo/constants";
import OpenProjectButton from "./ButtonClient";
import { ProjectProvider } from "./ProjectProvider";

let cachedRoute = false;

jest.mock("next/link", () => ({
	__esModule: true,
	default({
		href,
		onClick,
		children,
		prefetch: _prefetch,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement> & {
		href: string;
		children: ReactNode;
		prefetch?: boolean;
	}) {
		return (
			<a
				href={href}
				onClick={(event: MouseEvent<HTMLAnchorElement>) => {
					event.preventDefault();
					onClick?.(event);
				}}
				{...props}
			>
				{children}
			</a>
		);
	},
}));

jest.mock("@/components/projects/WorkspaceNavigation", () => ({
	useWorkspaceNavigation: () => ({
		store: {
			hasRoute: () => cachedRoute,
			preferredHref: (_projectId: string, fallback: string) => fallback,
		},
	}),
}));

jest.mock("@/flows/default-construction/visual/project-sync-client", () => ({
	prefetchConstructionProjectBootstrap: jest.fn(),
}));

jest.mock("@/flows/demo/client/OzoluClient", () => ({
	loadOzoluClient: jest.fn(),
	openOzoluProject: jest.fn(),
}));

const prefetchBootstrap = jest.mocked(prefetchConstructionProjectBootstrap);

function renderProjectButton(
	props: Partial<React.ComponentProps<typeof OpenProjectButton>> = {},
) {
	return render(
		<ProjectProvider userId="user">
			<OpenProjectButton
				projectId="site"
				projectName="Project"
				label="Open project"
				prefetchConstructionBootstrap
				{...props}
			/>
		</ProjectProvider>,
	);
}

beforeEach(() => {
	jest.useFakeTimers();
	cachedRoute = false;
	prefetchBootstrap.mockReset();
});

afterEach(() => {
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
});

it("starts the construction bootstrap after deliberate hover intent", () => {
	renderProjectButton();
	const link = screen.getByRole("link", { name: "Open project" });
	fireEvent.mouseEnter(link);
	act(() => jest.advanceTimersByTime(179));
	expect(prefetchBootstrap).not.toHaveBeenCalled();
	act(() => jest.advanceTimersByTime(1));
	expect(prefetchBootstrap).toHaveBeenCalledWith("site");
});

it("cancels delayed pointer and focus intent when it ends", () => {
	renderProjectButton();
	const link = screen.getByRole("link", { name: "Open project" });
	fireEvent.mouseEnter(link);
	fireEvent.mouseLeave(link);
	fireEvent.focus(link);
	fireEvent.blur(link);
	act(() => jest.advanceTimersByTime(180));
	expect(prefetchBootstrap).not.toHaveBeenCalled();
});

it("starts the handoff immediately for touch and normal click", () => {
	renderProjectButton();
	const link = screen.getByRole("link", { name: "Open project" });
	fireEvent.touchStart(link);
	expect(prefetchBootstrap).toHaveBeenCalledWith("site");
	prefetchBootstrap.mockClear();
	fireEvent.click(link);
	expect(prefetchBootstrap).toHaveBeenCalledWith("site");
});

it.each([
	["another flow", { prefetchConstructionBootstrap: false }],
	[
		"a custom destination",
		{
			href: "/dashboard/invoices?project=site",
			projectId: "site",
			projectName: "Project",
		},
	],
	[
		"the demo project",
		{ projectId: DEMO_SITE_ID, projectName: "Demo project" },
	],
])("does not bootstrap %s", (_case, props) => {
	renderProjectButton(props as React.ComponentProps<typeof OpenProjectButton>);
	const link = screen.getByRole("link", { name: "Open project" });
	fireEvent.mouseEnter(link);
	act(() => jest.advanceTimersByTime(180));
	fireEvent.click(link);
	expect(prefetchBootstrap).not.toHaveBeenCalled();
});

it("does not bootstrap a retained cached workspace", () => {
	cachedRoute = true;
	renderProjectButton();
	const link = screen.getByRole("link", { name: "Open project" });
	fireEvent.mouseEnter(link);
	act(() => jest.advanceTimersByTime(180));
	fireEvent.click(link);
	expect(prefetchBootstrap).not.toHaveBeenCalled();
});
