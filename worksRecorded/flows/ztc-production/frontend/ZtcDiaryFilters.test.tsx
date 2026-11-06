import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ztcConfig from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";

const mockSnapshot = jest.fn();
const mockPage = jest.fn();
const mockOptions = jest.fn();
const mockSummary = jest.fn();
const mockMedia = jest.fn();
const mockGetConfig = jest.fn();
const mockRates = jest.fn();

jest.mock("@/flows/ztc-production/backend/actions", () => ({
	getZtcDiarySnapshot: (...args: unknown[]) => mockSnapshot(...args),
	getZtcFilterOptions: (...args: unknown[]) => mockOptions(...args),
	getZtcScopeSummary: (...args: unknown[]) => mockSummary(...args),
	getZtcRatesDialogData: (...args: unknown[]) => mockRates(...args),
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
		expect(mockGetConfig).toHaveBeenCalledTimes(1);
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
});
