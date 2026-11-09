import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { patchProject } from "../visual/project-sync";
import { RetainedLimeniForma2 } from "./RetainedLimeniForma2";

jest.mock("next/navigation", () => ({
	usePathname: () => "/dashboard/sites/site/analytics",
}));
jest.mock("@/components/projects/WorkspaceActivity", () => ({
	WorkspaceView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectPreparationReporter: () => jest.fn(),
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
		snapshot: {
			bootstrap: true,
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

const originalFetch = global.fetch;

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
