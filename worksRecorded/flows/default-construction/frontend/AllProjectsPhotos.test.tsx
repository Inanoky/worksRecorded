import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import AllProjectsPage from "@/app/dashboard/all-projects/page";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { loadAllProjectsDiary } from "../backend/all-projects-diary";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";

jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user" }),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationIdByUserId: jest.fn(),
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: async () => "default-construction",
}));
jest.mock("../backend/all-projects-diary", () => ({
	loadAllProjectsDiary: jest.fn(),
}));
jest.mock("@/components/providers/ProjectNavigationLink", () => ({
	ProjectNavigationLink: () => <span>Project link</span>,
}));
jest.mock("@/components/sitediary/OriginalSourceContent", () => ({
	OriginalSourceContent: () => null,
}));
jest.mock("../sb-stomme-inline-plan/InlinePlan", () => ({
	SbPlanProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("./AllProjectsPhotoPreloader", () => ({
	AllProjectsPhotoPreloader: ({ children }: { children: ReactNode }) => (
		<div data-testid="photo-preloader">{children}</div>
	),
}));
jest.mock("./DiaryRecordPhotos", () => ({
	DiaryRecordPhotos: ({ photos }: { photos: string[] }) => (
		<span data-testid="record-photos">{photos.join(",")}</span>
	),
}));

beforeEach(() => {
	jest.mocked(loadAllProjectsDiary).mockResolvedValue({
		projects: [],
		photoUrls: ["https://utfs.io/f/photo"],
		quantityPlanFactEnabled: false,
		totalCount: 1,
		totalPages: 1,
		page: 1,
		pageSize: 50,
		records: [
			{
				id: "diary",
				siteId: "site",
				createdAt: new Date("2026-09-23"),
				Works: "Floor",
				Photos: ["https://utfs.io/f/photo"],
				quantityComparisonStatus: "unknown",
				Site: { name: "Site" },
			},
		],
	} as never);
});

it("shows linked photos in both desktop rows and mobile cards for Limeni", async () => {
	jest
		.mocked(getOrganizationIdByUserId)
		.mockResolvedValue(LIMENI_ORGANIZATION_ID);
	render(await AllProjectsPage({ searchParams: Promise.resolve({}) }));
	expect(screen.getByTestId("photo-preloader")).toBeInTheDocument();
	expect(
		screen.getByRole("columnheader", { name: "Foto" }),
	).toBeInTheDocument();
	expect(screen.getAllByTestId("record-photos")).toHaveLength(2);
	expect(screen.getAllByTestId("record-photos")[0]).toHaveTextContent(
		"https://utfs.io/f/photo",
	);
});

it("leaves other organizations without photos or a preload gate", async () => {
	jest.mocked(getOrganizationIdByUserId).mockResolvedValue("other-org");
	render(await AllProjectsPage({ searchParams: Promise.resolve({}) }));
	expect(screen.queryByTestId("photo-preloader")).not.toBeInTheDocument();
	expect(
		screen.queryByRole("columnheader", { name: "Foto" }),
	).not.toBeInTheDocument();
	expect(screen.queryByTestId("record-photos")).not.toBeInTheDocument();
});

it.each([true, false])(
	"fits Limeni columns into 100 percent of the table with plan=%s",
	async (plan) => {
		jest
			.mocked(getOrganizationIdByUserId)
			.mockResolvedValue(LIMENI_ORGANIZATION_ID);
		const data = await loadAllProjectsDiary(LIMENI_ORGANIZATION_ID);
		jest
			.mocked(loadAllProjectsDiary)
			.mockResolvedValue({ ...data, quantityPlanFactEnabled: plan });
		render(await AllProjectsPage({ searchParams: Promise.resolve({}) }));
		const table = screen.getByRole("table");
		expect(table.className).not.toMatch(/min-w-\[/);
		const cols = Array.from(table.querySelectorAll("col"));
		expect(cols).toHaveLength(plan ? 12 : 11);
		expect(
			cols.reduce((sum, col) => sum + Number.parseFloat(col.style.width), 0),
		).toBe(100);
		expect(
			screen.getByRole("columnheader", { name: "Avots" }),
		).toBeInTheDocument();
	},
);

it("shows pagination above and below the records and preserves filters", async () => {
	jest
		.mocked(getOrganizationIdByUserId)
		.mockResolvedValue(LIMENI_ORGANIZATION_ID);
	const data = await loadAllProjectsDiary(LIMENI_ORGANIZATION_ID);
	jest.mocked(loadAllProjectsDiary).mockResolvedValue({
		...data,
		page: 2,
		pageSize: 30,
		totalCount: 138,
		totalPages: 5,
	});
	render(
		await AllProjectsPage({
			searchParams: Promise.resolve({
				page: "2",
				project: "site",
				q: "floor",
				from: "2026-09-01",
			}),
		}),
	);
	expect(screen.getByText("31–60 / 138 ieraksti")).toBeInTheDocument();
	const nextLinks = screen.getAllByRole("link", { name: "Nākamā" });
	expect(nextLinks).toHaveLength(2);
	for (const link of nextLinks)
		expect(link).toHaveAttribute(
			"href",
			"/dashboard/all-projects?project=site&q=floor&from=2026-09-01&page=3",
		);
});
