import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ReactNode, StrictMode, useEffect, useState } from "react";
import type { FimaActsData } from "@/lib/fima/act-register";
import { getFimaActsForSite } from "@/server/actions/fima-acts";
import { FimaProjectNavigationLink } from "./FimaProjectNavigationLink";
import { FimaProjectContent, FimaProjectProvider } from "./FimaProjectProvider";

jest.mock("next/link", () =>
	jest.requireActual("next/dist/client/app-dir/link"),
);
jest.mock("next/dist/client/components/links", () => ({
	IDLE_LINK_STATUS: { pending: false },
	mountLinkInstance: jest.fn(() => null),
	unmountPrefetchableInstance: jest.fn(),
	onNavigationIntent: jest.fn(),
}));
jest.mock("@/server/actions/fima-acts", () => ({
	getFimaActsForSite: jest.fn(),
}));
jest.mock("./FimaActsPage", () => ({
	FimaActsPage: ({ initial }: { initial: FimaActsData }) => {
		const [value, setValue] = useState("");
		return (
			<section>
				<h1>{initial.siteName} akti</h1>
				<input
					aria-label="Akta filtrs"
					value={value}
					onChange={(event) => setValue(event.target.value)}
				/>
			</section>
		);
	},
}));
jest.mock("@/components/sitediary/SiteDiaryList", () => ({
	__esModule: true,
	default: () => {
		const [page, setPage] = useState("1");
		const [filter, setFilter] = useState("");
		return (
			<section>
				<h1>Žurnāla dati</h1>
				<input
					aria-label="Žurnāla lapa"
					value={page}
					onChange={(event) => setPage(event.target.value)}
				/>
				<input
					aria-label="Žurnāla filtrs"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
				/>
				<div data-slot="table-container" />
			</section>
		);
	},
}));
const request = jest.fn();
const originalFetch = globalThis.fetch;
const router: AppRouterInstance = {
	push: jest.fn(),
	replace: jest.fn(),
	prefetch: jest.fn(),
	refresh: jest.fn(),
	back: jest.fn(),
	forward: jest.fn(),
};
const prefetch = jest.fn();
const payload = (siteId: string): FimaActsData => ({
	siteId,
	siteName: siteId,
	caseId: "123",
	checkedAt: null,
	rows: [],
	choices: [],
	references: [],
});
function Router({ children }: { children: ReactNode }) {
	const [path, setPath] = useState(window.location.pathname);
	useEffect(() => {
		const change = () => setPath(window.location.pathname);
		window.addEventListener("popstate", change);
		return () => window.removeEventListener("popstate", change);
	}, []);
	return (
		<AppRouterContext.Provider value={router}>
			<PathnameContext.Provider value={path}>
				{children}
			</PathnameContext.Provider>
		</AppRouterContext.Provider>
	);
}
function App({
	identity = "user-org",
	siteId = "a",
	enabled = true,
}: {
	identity?: string;
	siteId?: string;
	enabled?: boolean;
}) {
	return (
		<Router>
			<FimaProjectProvider key={identity} siteIds={enabled ? ["a", "b"] : []}>
				<FimaProjectNavigationLink
					href={`/dashboard/sites/${siteId}/acts`}
					onMouseEnter={prefetch}
				>
					Akti
				</FimaProjectNavigationLink>
				<FimaProjectNavigationLink
					href={`/dashboard/sites/${siteId}/dashboard`}
					onMouseEnter={prefetch}
				>
					Žurnāls
				</FimaProjectNavigationLink>
				<FimaProjectContent key={siteId} siteId={siteId}>
					<h1>Žurnāla dati</h1>
				</FimaProjectContent>
			</FimaProjectProvider>
		</Router>
	);
}
beforeEach(() => {
	jest.clearAllMocks();
	globalThis.fetch = request;
	request.mockImplementation(async (_url, options) => {
		const siteId = JSON.parse(options.body).project;
		return {
			ok: true,
			status: 200,
			json: async () => ({
				siteId,
				revision: "v1",
				configVersion: "c1",
				versions: {},
				rows: [],
				config: { otherSettings: { fimaCollaboration: true } },
				removed: [],
				bisEnabled: true,
				organizationLanguage: "lv",
			}),
		};
	});
	window.history.replaceState(null, "", "/dashboard/sites/a/dashboard");
	const push = window.history.pushState.bind(window.history);
	jest
		.spyOn(window.history, "pushState")
		.mockImplementation((data, unused, url) => {
			push(data, unused, url);
			window.dispatchEvent(new PopStateEvent("popstate"));
		});
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
	jest
		.mocked(getFimaActsForSite)
		.mockImplementation(async (siteId) => payload(siteId));
});
afterEach(() => {
	jest.restoreAllMocks();
	globalThis.fetch = originalFetch;
});
it("preloads while the project opens and never calls the server on hover, focus, click or repeated navigation", async () => {
	render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
	await waitFor(() =>
		expect(screen.queryByRole("status")).not.toBeInTheDocument(),
	);
	expect(getFimaActsForSite).toHaveBeenCalledTimes(1);
	expect(request).toHaveBeenCalledTimes(1);
	fireEvent.change(
		await screen.findByRole("textbox", { name: "Žurnāla lapa" }),
		{ target: { value: "15" } },
	);
	fireEvent.change(screen.getByRole("textbox", { name: "Žurnāla filtrs" }), {
		target: { value: "BIS-BL-668714" },
	});
	const link = screen.getByRole("link", { name: "Akti" });
	fireEvent.mouseEnter(link);
	fireEvent.focus(link);
	fireEvent.touchStart(link);
	fireEvent.click(link);
	expect(await screen.findByRole("heading", { name: "a akti" })).toBeVisible();
	fireEvent.change(screen.getByRole("textbox", { name: "Akta filtrs" }), {
		target: { value: "saved filter" },
	});
	fireEvent.click(screen.getByRole("link", { name: "Žurnāls" }));
	expect(screen.getByRole("heading", { name: "Žurnāla dati" })).toBeVisible();
	expect(screen.getByRole("textbox", { name: "Žurnāla lapa" })).toHaveValue(
		"15",
	);
	expect(screen.getByRole("textbox", { name: "Žurnāla filtrs" })).toHaveValue(
		"BIS-BL-668714",
	);
	expect(request).toHaveBeenCalledTimes(1);
	fireEvent.click(link);
	expect(screen.getByRole("textbox", { name: "Akta filtrs" })).toHaveValue(
		"saved filter",
	);
	expect(getFimaActsForSite).toHaveBeenCalledTimes(1);
	expect(prefetch).not.toHaveBeenCalled();
	expect(router.push).not.toHaveBeenCalled();
	expect(router.prefetch).not.toHaveBeenCalled();
});
it("shares the initial in-flight preparation with navigation and renders a directly opened Acts URL", async () => {
	window.history.replaceState(null, "", "/dashboard/sites/a/acts");
	let resolve!: (value: FimaActsData) => void;
	jest.mocked(getFimaActsForSite).mockReturnValueOnce(
		new Promise((done) => {
			resolve = done;
		}),
	);
	render(<App />);
	expect(screen.getByRole("status")).toHaveTextContent("Sagatavo FIMA žurnālu");
	fireEvent.click(screen.getByRole("link", { name: "Akti" }));
	expect(getFimaActsForSite).toHaveBeenCalledTimes(1);
	await act(async () => resolve(payload("a")));
	expect(await screen.findByRole("heading", { name: "a akti" })).toBeVisible();
	expect(router.push).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("link", { name: "Žurnāls" }));
	expect(
		await screen.findByRole("heading", { name: "Žurnāla dati" }),
	).toBeVisible();
	expect(request).toHaveBeenCalledTimes(1);
});
it("handles back and forward locally without remounting the prepared view", async () => {
	render(<App />);
	await waitFor(() => expect(getFimaActsForSite).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByRole("link", { name: "Akti" }));
	await screen.findByRole("heading", { name: "a akti" });
	fireEvent.change(screen.getByRole("textbox", { name: "Akta filtrs" }), {
		target: { value: "KT-21" },
	});
	await act(async () => window.history.back());
	await screen.findByRole("heading", { name: "Žurnāla dati" });
	await act(async () => window.history.forward());
	await screen.findByRole("heading", { name: "a akti" });
	expect(screen.getByRole("textbox", { name: "Akta filtrs" })).toHaveValue(
		"KT-21",
	);
	expect(getFimaActsForSite).toHaveBeenCalledTimes(1);
});
it("keeps projects and signed-in identities separate and never preloads a non-FIMA project", async () => {
	const view = render(<App />);
	await waitFor(() => expect(getFimaActsForSite).toHaveBeenCalledTimes(1));
	act(() => {
		window.history.pushState(null, "", "/dashboard/sites/b/dashboard");
	});
	view.rerender(<App siteId="b" />);
	await waitFor(() => expect(getFimaActsForSite).toHaveBeenCalledWith("b"));
	view.rerender(<App siteId="b" identity="other-user" />);
	await waitFor(() => expect(getFimaActsForSite).toHaveBeenCalledTimes(3));
	view.rerender(<App siteId="b" identity="ordinary" enabled={false} />);
	expect(getFimaActsForSite).toHaveBeenCalledTimes(3);
});
it("does not retry a failed preparation when the tab is clicked; retry is explicit", async () => {
	jest
		.mocked(getFimaActsForSite)
		.mockRejectedValueOnce(new Error("Access denied"));
	render(<App />);
	expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
	fireEvent.click(screen.getByRole("link", { name: "Akti" }));
	expect(getFimaActsForSite).toHaveBeenCalledTimes(1);
	expect(
		screen.queryByRole("heading", { name: "a akti" }),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	expect(await screen.findByRole("heading", { name: "a akti" })).toBeVisible();
	expect(getFimaActsForSite).toHaveBeenCalledTimes(2);
});

it("restores journal scroll positions without navigation requests", async () => {
	render(<App />);
	await screen.findByRole("heading", { name: "Žurnāla dati" });
	await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
	Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
	const table = screen
		.getByRole("region", { name: "Būvdarbu žurnāls" })
		.querySelector<HTMLElement>('[data-slot="table-container"]');
	if (!table) throw new Error("Missing diary table");
	table.scrollLeft = 180;
	fireEvent.scroll(window);
	fireEvent.scroll(table);
	fireEvent.click(screen.getByRole("link", { name: "Akti" }));
	await screen.findByRole("heading", { name: "a akti" });
	Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
	fireEvent.click(screen.getByRole("link", { name: "Žurnāls" }));
	await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 500));
	expect(table.scrollLeft).toBe(180);
	expect(request).toHaveBeenCalledTimes(1);
});
