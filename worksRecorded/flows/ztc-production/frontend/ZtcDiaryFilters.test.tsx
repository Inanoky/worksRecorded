import { deserialize, serialize } from "node:v8";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import ztcConfig from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { ZtcPersistentCache } from "@/flows/ztc-production/lib/ztc-persistent-cache";
import type {
	ZtcWorkspaceData,
	ZtcWorkspaceResult,
} from "@/flows/ztc-production/lib/ztc-workspace-data";

const mockSnapshot = jest.fn();
const mockPage = jest.fn();
const mockOptions = jest.fn();
const mockSummary = jest.fn();
const mockMedia = jest.fn();
const mockGetConfig = jest.fn();
const mockRates = jest.fn();
const mockWorkspace = jest.fn();
let mockScope = "user:org";
const originalBrowserStorage = {
	indexedDB: global.indexedDB,
	structuredClone: global.structuredClone,
};
const cachedWorkspace: ZtcWorkspaceData = {
	siteId: "site-a",
	config: ztcConfig,
	mediaOnlyDays: [],
	projectOptions: ["Projekts A", "Projekts B"],
	rates: [
		{
			projectName: "Visi projekti",
			works: [{ task: "Latojums", rate: "2", unit: "m2", laborNorm: "0.2" }],
			additionalDetails: [],
			additionalWorks: [],
		},
	],
	rows: [
		{
			id: "cached",
			Date: "2026-11-04T10:00:00",
			Date_Custom_1: "2026-11-04T09:00:00",
			Date_Custom_2: "2026-11-04T10:00:00",
			Works: "Latojums",
			Location: "Projekts A",
			Location_Custom_1: "Siena 1",
			createdBy: "Cached worker",
			Amounts: "10",
			Units: "m2",
			TimeInvolved: "1",
			Location_Custom_2: "2",
			Photos: [],
		},
	],
};

jest.mock("@/flows/ztc-production/backend/actions", () => ({
	getZtcDiarySnapshot: (...args: unknown[]) => mockSnapshot(...args),
	getZtcFilterOptions: (...args: unknown[]) => mockOptions(...args),
	getZtcScopeSummary: (...args: unknown[]) => mockSummary(...args),
	getZtcRatesDialogData: (...args: unknown[]) => mockRates(...args),
	getZtcWorkspaceSnapshot: (...args: unknown[]) => mockWorkspace(...args),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: (...args: unknown[]) => mockGetConfig(...args),
	getSiteDiaryRecordsPage: (...args: unknown[]) => mockPage(...args),
	getSiteDiaryMediaOnlyDays: (...args: unknown[]) => mockMedia(...args),
}));
jest.mock("@/server/actions/pdfBuilderForFrontend", () => ({}));
jest.mock("@/server/actions/fima-diary-collaboration", () => ({}));
jest.mock(
	"@/components/projects/WorkspaceActivity",
	() => ({
		useWorkspaceVisible: () => true,
		useWorkspaceManaged: () => false,
		useWorkspaceProtection: () => undefined,
		WorkspacePortalActivity: ({ children }: { children: React.ReactNode }) =>
			children,
	}),
	{ virtual: true },
);
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectPreparationStep: () => undefined,
	useProjectCacheScope: () => mockScope,
}));
jest.mock("@/components/providers/ProjectOpeningOverlay", () => ({
	ProjectOpeningOverlay: () => null,
}));
jest.mock("@/components/sitediary/useFimaDiaryFilterOptions", () => ({
	useFimaDiaryFilterOptions: () => null,
}));
jest.mock("@/components/sitediary/FimaRecordPanel", () => ({
	FimaRecordPanel: () => null,
}));
jest.mock("@/components/sitediary/FimaDiaryCell", () => ({
	FimaDiaryCell: () => null,
}));
jest.mock("@/components/sitediary/FimaActsRefreshButton", () => ({
	FimaActsRefreshButton: () => null,
}));
jest.mock("@/components/sitediary/FimaInlineCell", () => ({
	FimaInlineCell: () => null,
	isFimaInlineField: () => false,
}));
jest.mock("@/components/sitediary/BeginHours", () => ({
	useBeginHours: () => ({ enabled: false, days: [], diaryDates: [] }),
	BeginHoursCost: () => null,
	BeginHoursImport: () => null,
}));
jest.mock("@/components/sitediary/BeginRecordHours", () => ({
	BeginRecordHours: () => null,
}));
jest.mock("@/flows/default-construction/planner/ConstructionPlanner", () => ({
	useConstructionPlanner: () => ({
		diaryRows: [],
		show: false,
		showAny: false,
	}),
	PlannerControls: () => null,
}));
jest.mock(
	"@/flows/default-construction/frontend/useDefaultConstructionSiteDiarySummary",
	() => ({
		useDefaultConstructionSiteDiarySummary: () => ({
			panel: null,
			clearSummary: jest.fn(),
		}),
	}),
);
jest.mock("@/flows/default-construction/frontend/DiaryPhotoActions", () => ({
	DiaryPhotoUploadMenuItem: () => null,
	DiaryPhotoUploadProvider: ({ children }: { children: React.ReactNode }) =>
		children,
}));
jest.mock("@/flows/default-construction/frontend/DiaryFeedbackBrain", () => ({
	DiaryFeedbackBrain: () => null,
}));
jest.mock("@/flows/default-construction/frontend/DiarySaveProvider", () => ({
	useDiarySaveQueue: () => ({
		queue: null,
		snapshot: { items: [], revision: 0 },
	}),
}));
jest.mock("@/components/sitediary/SiteDiaryOptionsManager", () => ({
	SiteDiaryOptionsManager: () => null,
}));
jest.mock("@/components/sitediary/OriginalSourceContent", () => ({
	OriginalSourceContent: () => null,
}));
jest.mock("@/components/sitediary/Use-media-querty", () => ({
	useMediaQuery: () => false,
}));
jest.mock("sonner", () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}));

import SiteDiaryList from "@/components/sitediary/SiteDiaryList";

describe("ZTC diary filter requests", () => {
	beforeAll(() => {
		Object.defineProperty(globalThis, "ResizeObserver", {
			configurable: true,
			value: class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		});
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			configurable: true,
			value: () => undefined,
		});
	});
	beforeEach(() => {
		jest.clearAllMocks();
		global.indexedDB = new IDBFactory();
		global.structuredClone = (value) => deserialize(serialize(value));
		mockScope = "user:org";
		mockWorkspace.mockImplementation(
			async ({ siteId }: { siteId: string }) => ({
				status: "ok",
				data: {
					...cachedWorkspace,
					siteId,
					rows: await mockSnapshot({ siteId }),
				},
			}),
		);
		mockGetConfig.mockResolvedValue(ztcConfig);
		mockMedia.mockResolvedValue([]);
		mockRates.mockResolvedValue({
			rates: [
				{
					projectName: "Visi projekti",
					works: [
						{ task: "Latojums", rate: "2", unit: "m2", laborNorm: "0.2" },
					],
					additionalDetails: [],
					additionalWorks: [],
				},
			],
			projectOptions: ["Projekts A", "Projekts B"],
		});
		mockSnapshot.mockResolvedValue(
			Array.from({ length: 80 }, (_, index) => ({
				id: `row-${index}`,
				Date: "2026-11-04T10:00:00",
				Date_Custom_1: "2026-11-04T09:00:00",
				Date_Custom_2: "2026-11-04T10:00:00",
				Location: index === 79 ? "Projekts B" : "Projekts A",
				Location_Custom_1: "Siena 1",
				Works: "Latojums",
				createdBy: "Jānis Bērziņš",
				Units: "m2",
				Amounts: "10",
				TimeInvolved: "1",
				Location_Custom_2: "2",
				Photos: [],
			})),
		);
	});

	it("filters, summarizes, clears and changes pages without requesting server data", async () => {
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await waitFor(() => expect(mockSnapshot).toHaveBeenCalledTimes(1));
		await screen.findAllByText("Latojums");
		fireEvent.click(screen.getByText("Visi projekti"));
		fireEvent.click(
			await screen.findByText("Projekts B", { selector: "span" }),
		);
		expect(await screen.findByText("Projekts: Projekts B")).toBeInTheDocument();
		expect(screen.getByText("20,00 €")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Notīrīt filtrus"));
		expect(screen.queryByText("Projekts: Projekts B")).not.toBeInTheDocument();
		expect(screen.getByText("Visi projekti")).toBeInTheDocument();
		fireEvent.click(screen.getAllByText("2", { selector: "a" })[0]);
		fireEvent.change(screen.getByPlaceholderText("Meklēt pēc atslēgvārda…"), {
			target: { value: "Projekts B" },
		});
		expect(screen.getAllByText("Projekts B").length).toBeGreaterThan(0);
		fireEvent.click(screen.getByText("Notīrīt filtrus"));
		expect(screen.getByPlaceholderText("Meklēt pēc atslēgvārda…")).toHaveValue(
			"",
		);
		expect(mockSnapshot).toHaveBeenCalledTimes(1);
		expect(mockMedia).toHaveBeenCalledTimes(1);
		expect(mockGetConfig).not.toHaveBeenCalled();
		expect(mockRates).not.toHaveBeenCalled();
		expect(mockPage).not.toHaveBeenCalled();
		expect(mockOptions).not.toHaveBeenCalled();
		expect(mockSummary).not.toHaveBeenCalled();
	}, 20000);

	it("refreshes the snapshot explicitly and loads a new one after switching sites", async () => {
		const initial = {
			id: "record-a",
			Date: "2026-11-04T10:00:00",
			Location: "Projekts A",
			Works: "Latojums",
			createdBy: "Jānis Bērziņš",
			Units: "m2",
			Amounts: "10",
			TimeInvolved: "1",
			Location_Custom_2: "2",
			Photos: [],
		};
		mockSnapshot
			.mockResolvedValueOnce([initial])
			.mockResolvedValueOnce([
				{ ...initial, TimeInvolved: "2", Location_Custom_2: "4" },
			])
			.mockResolvedValueOnce([
				{ ...initial, id: "record-b", Location: "Projekts B" },
			]);
		const { rerender } = render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await screen.findAllByText("Latojums");
		fireEvent.click(screen.getByText("Visi projekti"));
		fireEvent.click(
			await screen.findByText("Projekts A", { selector: "span" }),
		);
		expect(screen.getByText("Projekts: Projekts A")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Atjaunot ierakstus"));
		await waitFor(() => expect(mockSnapshot).toHaveBeenCalledTimes(2));
		expect(await screen.findByText("40,00 €")).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByText("Projekts: Projekts A")).toBeInTheDocument(),
		);
		rerender(
			<SiteDiaryList
				siteId="site-b"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await waitFor(() =>
			expect(mockSnapshot).toHaveBeenLastCalledWith({ siteId: "site-b" }),
		);
		expect(mockSnapshot).toHaveBeenCalledTimes(3);
		expect(mockPage).not.toHaveBeenCalled();
	});

	afterAll(() => {
		Object.assign(global, originalBrowserStorage);
	});

	it("shows persisted rows before revalidation and preserves unsaved payroll inputs", async () => {
		await new ZtcPersistentCache(mockScope, "site-a").write(cachedWorkspace);
		let resolve: (value: ZtcWorkspaceResult) => void = () => {};
		mockWorkspace.mockReturnValue(
			new Promise<ZtcWorkspaceResult>((yes) => {
				resolve = yes;
			}),
		);
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		expect(
			(await screen.findAllByText("Cached worker")).length,
		).toBeGreaterThan(0);
		fireEvent.change(screen.getAllByDisplayValue("2")[0], {
			target: { value: "4.5" },
		});
		await act(async () => {
			resolve({
				status: "ok",
				data: {
					...cachedWorkspace,
					rows: [
						{
							...cachedWorkspace.rows[0],
							Location_Custom_2: "9",
							createdBy: "Fresh worker",
						},
					],
				},
			});
		});
		expect((await screen.findAllByText("Fresh worker")).length).toBeGreaterThan(
			0,
		);
		expect(screen.getAllByDisplayValue("4.5").length).toBeGreaterThan(0);
		await waitFor(async () =>
			expect(
				(await new ZtcPersistentCache(mockScope, "site-a").read())?.rows[0]
					.Location_Custom_2,
			).toBe("9"),
		);
		expect(mockWorkspace).toHaveBeenCalledTimes(1);
		expect(mockRates).not.toHaveBeenCalled();
	});

	it("keeps cached content usable if the background refresh fails", async () => {
		await new ZtcPersistentCache(mockScope, "site-a").write(cachedWorkspace);
		mockWorkspace.mockRejectedValue(new Error("Offline"));
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="en"
			/>,
		);
		expect(
			(await screen.findAllByText("Cached worker")).length,
		).toBeGreaterThan(0);
		expect(
			await screen.findByText(/Could not refresh the production diary/),
		).toBeInTheDocument();
		fireEvent.click(screen.getByText("Visi projekti"));
		fireEvent.click(
			await screen.findByText("Projekts A", { selector: "span" }),
		);
		expect(screen.getByText("Projekts: Projekts A")).toBeInTheDocument();
	});

	it("never shows another signed-in user's cached records", async () => {
		await new ZtcPersistentCache(mockScope, "site-a").write(cachedWorkspace);
		mockScope = "other:org";
		mockWorkspace.mockReturnValue(new Promise(() => {}));
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await waitFor(() => expect(mockWorkspace).toHaveBeenCalledTimes(1));
		expect(screen.queryByText("Cached worker")).not.toBeInTheDocument();
	});

	it("persists a successful load and renders it after reopening while the next request is pending", async () => {
		mockWorkspace.mockResolvedValueOnce({
			status: "ok",
			data: cachedWorkspace,
		});
		const first = render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await screen.findAllByText("Cached worker");
		await waitFor(async () =>
			expect(
				await new ZtcPersistentCache(mockScope, "site-a").read(),
			).toMatchObject({ siteId: "site-a" }),
		);
		first.unmount();
		mockWorkspace.mockReturnValue(new Promise(() => {}));
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		expect(
			(await screen.findAllByText("Cached worker")).length,
		).toBeGreaterThan(0);
		expect(mockWorkspace).toHaveBeenCalledTimes(2);
	});

	it("keeps rate dialog edits intact when background rates change", async () => {
		await new ZtcPersistentCache(mockScope, "site-a").write(cachedWorkspace);
		let resolve: (value: ZtcWorkspaceResult) => void = () => {};
		mockWorkspace.mockReturnValue(
			new Promise<ZtcWorkspaceResult>((yes) => {
				resolve = yes;
			}),
		);
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await screen.findAllByText("Cached worker");
		fireEvent.click(screen.getByText("Darbu likmes"));
		const dialog = within(screen.getByRole("dialog"));
		fireEvent.change(dialog.getByDisplayValue("2"), { target: { value: "7" } });
		const rates = [
			{
				...cachedWorkspace.rates[0],
				works: [{ ...cachedWorkspace.rates[0].works[0], rate: "9" }],
			},
		];
		await act(async () => {
			resolve({ status: "ok", data: { ...cachedWorkspace, rates } });
		});
		expect(dialog.getByDisplayValue("7")).toBeInTheDocument();
	});

	it("revalidates on returning to the window without hiding cached rows", async () => {
		mockWorkspace.mockResolvedValueOnce({
			status: "ok",
			data: cachedWorkspace,
		});
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await screen.findAllByText("Cached worker");
		mockWorkspace.mockReturnValue(new Promise(() => {}));
		fireEvent(window, new Event("focus"));
		await waitFor(() => expect(mockWorkspace).toHaveBeenCalledTimes(2));
		expect(screen.getAllByText("Cached worker").length).toBeGreaterThan(0);
	});

	it("removes visible and persisted records when access is revoked", async () => {
		await new ZtcPersistentCache(mockScope, "site-a").write(cachedWorkspace);
		let resolve: (value: ZtcWorkspaceResult) => void = () => {};
		mockWorkspace.mockReturnValue(
			new Promise<ZtcWorkspaceResult>((yes) => {
				resolve = yes;
			}),
		);
		render(
			<SiteDiaryList
				siteId="site-a"
				isZtcFlow
				bisEnabled={false}
				organizationLanguage="lv"
			/>,
		);
		await screen.findAllByText("Cached worker");
		await act(async () => {
			resolve({ status: "denied" });
		});
		expect(
			await screen.findByText("Jums nav piekļuves ražošanas žurnālam."),
		).toBeInTheDocument();
		expect(screen.queryByText("Cached worker")).not.toBeInTheDocument();
		await waitFor(async () =>
			expect(
				await new ZtcPersistentCache(mockScope, "site-a").read(),
			).toBeUndefined(),
		);
	});
});
