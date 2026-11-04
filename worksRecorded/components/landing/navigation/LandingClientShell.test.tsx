import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import LandingClientShell from "./LandingClientShell";
import {
	type LoadedLandingPage,
	preloadLandingPage,
} from "./landing-page-registry";
import type { LandingMetadataMap } from "./landing-routes";

jest.mock("next-intl", () => {
	const messages = {};
	return {
		useLocale: () => "lv",
		useMessages: () => messages,
		NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
	};
});
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("../HeaderMobile", () => ({ __esModule: true, default: () => null }));
jest.mock("../LandingFooter", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./landing-page-registry", () => ({ preloadLandingPage: jest.fn() }));
jest.mock("../HeaderDesktop", () => ({
	__esModule: true,
	default: function NavigationProbe() {
		const { useLandingNavigation } = jest.requireActual<
			typeof import("./LandingNavigationContext")
		>("./LandingNavigationContext");
		const navigation = useLandingNavigation();
		return (
			<nav>
				<button
					type="button"
					onClick={() => void navigation?.navigate("/lv/Landing/Agents")}
				>
					Agents
				</button>
				<button
					type="button"
					onClick={() => void navigation?.navigate("/lv/Landing/Services")}
				>
					Services
				</button>
			</nav>
		);
	},
}));

const metadata: LandingMetadataMap = Object.fromEntries(
	["/Landing", "/Landing/Agents", "/Landing/Services"].map((path) => [
		path,
		{ title: path, meta: {}, links: [] },
	]),
);
const preload = jest.mocked(preloadLandingPage);

beforeEach(() => {
	window.history.replaceState({}, "", "/lv/Landing");
	document.head.innerHTML = "<title>Server page</title>";
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
	preload.mockReset();
	preload.mockImplementation(async (route) => ({
		render: () => <h1>{route.path}</h1>,
	}));
});

afterEach(() => jest.restoreAllMocks());

it("restores the URL's client page when Next.js reuses a different cached server entry", async () => {
	window.history.replaceState({}, "", "/lv/Landing/Services");
	render(
		<LandingClientShell metadata={metadata}>
			<h1>Old cached server entry</h1>
		</LandingClientShell>,
	);
	await screen.findByRole("heading", { name: "/Landing/Services" });
	expect(window.location.pathname).toBe("/lv/Landing/Services");
	expect(document.title).toBe("/Landing/Services");
});

it("ignores a slower earlier navigation and handles Back to the initial page", async () => {
	render(
		<LandingClientShell metadata={metadata}>
			<h1>Server entry</h1>
		</LandingClientShell>,
	);
	await screen.findByRole("heading", { name: "/Landing" });
	let resolveAgents: (page: LoadedLandingPage) => void = () => {};
	const agents = new Promise<LoadedLandingPage>((resolve) => {
		resolveAgents = resolve;
	});
	preload.mockImplementation(async (route) =>
		route.path === "/Landing/Agents"
			? agents
			: { render: () => <h1>{route.path}</h1> },
	);
	fireEvent.click(screen.getByRole("button", { name: "Agents" }));
	fireEvent.click(screen.getByRole("button", { name: "Services" }));
	await screen.findByRole("heading", { name: "/Landing/Services" });
	await act(async () =>
		resolveAgents({ render: () => <h1>Late agents page</h1> }),
	);
	expect(window.location.pathname).toBe("/lv/Landing/Services");
	expect(
		screen.queryByRole("heading", { name: "Late agents page" }),
	).toBeNull();
	act(() => {
		window.history.replaceState({}, "", "/lv/Landing");
		window.dispatchEvent(
			new PopStateEvent("popstate", { state: { landingScroll: [0, 0] } }),
		);
	});
	await waitFor(() => expect(document.title).toBe("/Landing"));
	expect(screen.getByRole("heading", { name: "/Landing" })).toBeTruthy();
});
