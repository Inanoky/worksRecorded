import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { patchProject } from "../visual/project-sync";
import { FORMA2_CHANGED } from "./forma2-client-refresh";
import { RetainedLimeniForma2 } from "./RetainedLimeniForma2";

jest.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
}));
jest.mock("@/components/projects/WorkspaceActivity", () => ({
	WorkspaceView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectPreparationReporter: () => mockReport,
	useVisualProjectPreload: () => false,
}));
jest.mock("@/components/providers/ProjectOpeningOverlay", () => ({
	ProjectOpeningOverlay: ({ label }: { label: string }) => (
		<output>{label}</output>
	),
}));
jest.mock("./DiarySaveProvider", () => ({
	useDiarySaveQueue: () => ({ snapshot: { revision: 0, items: [] } }),
}));
jest.mock("./LimeniProjectData", () => ({
	useLimeniProjectData: () => ({
		enabled: true,
		mode: mockMode,
		snapshot: {
			bootstrap: mockBootstrap,
			version: "bootstrap:one",
			forma2: { organizationLanguage: "lv", data: {} },
		},
	}),
}));
jest.mock("../visual/project-sync", () => ({ patchProject: jest.fn() }));
jest.mock("./DefaultConstructionForma2View", () => ({
	DefaultConstructionForma2View: ({ data }: { data: { siteName: string } }) => (
		<output>{data.siteName}</output>
	),
}));

let mockBootstrap = true;
let mockMode: "limeni" | "construction" = "construction";
let mockPathname = "/dashboard/sites/site/analytics";
const mockReport = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
	mockPathname = "/dashboard/sites/site/analytics";
	mockBootstrap = true;
	mockMode = "construction";
	jest.clearAllMocks();
});

afterEach(() => {
	global.fetch = originalFetch;
});

it("loads Forma 2 directly when the active project still has a bootstrap snapshot", async () => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: { get: () => '"forma2"' },
		json: async () => ({
			data: {
				siteName: "Forma 2 ready",
				document: null,
				resultRows: [],
				clientCosts: { positions: [], sources: [], allocations: [] },
			},
			organizationLanguage: "lv",
		}),
	} as unknown as Response);
	render(<RetainedLimeniForma2 siteId="site" />);
	expect(screen.getByText("Ielādē Forma 2…")).toBeInTheDocument();
	expect(await screen.findByText("Forma 2 ready")).toBeInTheDocument();
	expect(global.fetch).toHaveBeenCalledWith(
		"/api/sites/site/forma2/results",
		expect.objectContaining({ cache: "no-cache" }),
	);
	await waitFor(() => expect(patchProject).not.toHaveBeenCalled());
});

it("uses the shared Limeni project update when Forma 2 opens during background loading", async () => {
	mockMode = "limeni";
	global.fetch = jest.fn();
	const view = render(<RetainedLimeniForma2 siteId="site" />);
	expect(screen.getByText("Ielādē Forma 2…")).toBeInTheDocument();
	mockBootstrap = false;
	view.rerender(<RetainedLimeniForma2 siteId="site" />);
	await waitFor(() => expect(screen.queryByText("Ielādē Forma 2…")).not.toBeInTheDocument());
	expect(global.fetch).not.toHaveBeenCalled();
});

it("retains the loaded empty result across tab switches and refreshes after a Forma2 change", async () => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: { get: () => '"empty"' },
		json: async () => ({
			data: {
				siteName: "Empty Forma2",
				document: null,
				resultRows: [],
				clientCosts: { positions: [], sources: [], allocations: [] },
			},
			organizationLanguage: "lv",
		}),
	});
	const view = render(<RetainedLimeniForma2 siteId="site" />);
	expect(await screen.findByText("Empty Forma2")).toBeInTheDocument();
	mockPathname = "/dashboard/sites/site/dashboard";
	view.rerender(<RetainedLimeniForma2 siteId="site" />);
	mockPathname = "/dashboard/sites/site/analytics";
	view.rerender(<RetainedLimeniForma2 siteId="site" />);
	expect(global.fetch).toHaveBeenCalledTimes(1);
	await act(async () => {
		window.dispatchEvent(
			new CustomEvent(FORMA2_CHANGED, { detail: { siteId: "other" } }),
		);
	});
	expect(global.fetch).toHaveBeenCalledTimes(1);
	await act(async () => {
		window.dispatchEvent(
			new CustomEvent(FORMA2_CHANGED, { detail: { siteId: "site" } }),
		);
	});
	expect(global.fetch).toHaveBeenCalledTimes(2);
	expect(global.fetch).toHaveBeenLastCalledWith(
		"/api/sites/site/forma2/results",
		expect.objectContaining({ headers: { "If-None-Match": '"empty"' } }),
	);
});

it("revalidates an invalidated empty result on return to Forma2", async () => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: { get: () => '"empty"' },
		json: async () => ({
			data: {
				siteName: "Empty Forma2",
				document: null,
				resultRows: [],
				clientCosts: { positions: [], sources: [], allocations: [] },
			},
			organizationLanguage: "lv",
		}),
	});
	const view = render(<RetainedLimeniForma2 siteId="site" />);
	expect(await screen.findByText("Empty Forma2")).toBeInTheDocument();
	mockPathname = "/dashboard/sites/site/dashboard";
	view.rerender(<RetainedLimeniForma2 siteId="site" />);
	await act(async () => {
		window.dispatchEvent(
			new CustomEvent(FORMA2_CHANGED, { detail: { siteId: "site" } }),
		);
	});
	expect(global.fetch).toHaveBeenCalledTimes(1);
	mockPathname = "/dashboard/sites/site/analytics";
	view.rerender(<RetainedLimeniForma2 siteId="site" />);
	await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

it("does not replace full spending sources with the empty screen response", async () => {
	mockBootstrap = false;
	global.fetch = jest
		.fn()
		.mockResolvedValue({
			ok: true,
			status: 200,
			headers: { get: () => '"empty"' },
			json: async () => ({
				data: {
					siteName: "Empty response",
					document: null,
					resultRows: [],
					clientCosts: { positions: [], sources: [], allocations: [] },
				},
				organizationLanguage: "lv",
			}),
		});
	render(<RetainedLimeniForma2 siteId="site" />);
	await act(async () => {
		window.dispatchEvent(
			new CustomEvent(FORMA2_CHANGED, { detail: { siteId: "site" } }),
		);
	});
	expect(await screen.findByText("Empty response")).toBeInTheDocument();
	expect(patchProject).not.toHaveBeenCalled();
});
