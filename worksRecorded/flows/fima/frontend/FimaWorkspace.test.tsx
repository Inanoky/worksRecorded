import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import {
	getFimaWorkspaceActivity,
	getFimaWorkspaceSync,
	saveFimaRecord,
} from "../backend/client";
import { emptyProposal, type FimaRow } from "../lib/records";
import type { FimaWorkspaceDelta } from "../lib/workspace-sync";
import { FimaWorkspace } from "./FimaWorkspace";

jest.mock("../backend/client", () => ({
	getFimaWorkspaceSync: jest.fn(),
	getFimaWorkspaceActivity: jest.fn(),
	saveFimaRecord: jest.fn(),
}));
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => "user:org",
}));
jest.mock("@/components/fima/FimaProjectNavigationLink", () => ({
	FimaProjectNavigationLink: ({ children }: { children: React.ReactNode }) =>
		children,
}));
jest.mock(
	"@/flows/default-construction/visual/project-persistent-cache",
	() => ({
		PersistentProjectCache: jest.fn(() => ({
			read: async () => undefined,
			write: async () => {},
		})),
	}),
);
const clone = globalThis.structuredClone;
beforeAll(() => {
	globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
});
afterAll(() => {
	globalThis.structuredClone = clone;
});
const row: FimaRow = {
	id: "a",
	localId: "FIMA-1",
	siteId: "site",
	version: 1,
	stage: "draft",
	proposal: { ...emptyProposal("2026-11-06"), description: "Original work" },
	sources: [],
	bisId: null,
	bisCaseId: null,
	bisStatus: null,
	managed: false,
	snapshot: null,
	updatedAt: "2026-11-06",
};
const delta = (record: FimaRow): FimaWorkspaceDelta => ({
	scope: JSON.stringify(["user:org", null]),
	cache: {
		revision: String(record.version),
		records: { a: String(record.version) },
		sites: "s",
		templates: "t",
		operations: "o",
	},
	records: [record],
	order: ["a"],
	sites: [{ id: "site", name: "Project", bisCaseId: null, bisCaseName: null }],
	templates: [],
	operations: [],
	truncated: false,
	bisBase: "https://bis.gov.lv",
});

it("keeps a dirty proposal and its original version when a newer server record arrives", async () => {
	jest
		.mocked(getFimaWorkspaceSync)
		.mockResolvedValueOnce({ kind: "delta", delta: delta(row) })
		.mockResolvedValueOnce({
			kind: "delta",
			delta: delta({
				...row,
				version: 2,
				proposal: { ...row.proposal, description: "Updated on server" },
			}),
		});
	jest.mocked(getFimaWorkspaceActivity).mockResolvedValue({
		kind: "changed",
		scope: JSON.stringify(["user:org", null]),
	});
	jest.mocked(saveFimaRecord).mockRejectedValue(new Error("Version conflict"));
	render(<FimaWorkspace />);
	fireEvent.click(await screen.findByRole("button", { name: /^FIMA-1$/ }));
	fireEvent.change(
		screen.getByRole("textbox", { name: "BIS darbu apraksts" }),
		{ target: { value: "Unsaved proposal" } },
	);
	act(() => window.dispatchEvent(new Event("focus")));
	await screen.findByText("Updated on server");
	expect(
		screen.getByRole("textbox", { name: "BIS darbu apraksts" }),
	).toHaveValue("Unsaved proposal");
	fireEvent.click(
		screen.getByRole("button", { name: "Saglabāt priekšlikumu" }),
	);
	await waitFor(() =>
		expect(saveFimaRecord).toHaveBeenCalledWith(
			"a",
			1,
			expect.objectContaining({ description: "Unsaved proposal" }),
			"draft",
		),
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Version conflict",
	);
});
