import { prisma } from "@/lib/utils/db";
import {
	defaultVisualLayerSettings,
	removeVisualLayer,
	VISUAL_LAYERS_SETTINGS_KEY,
	visualLayerSettingsSchema,
} from "./layer-settings";
import { persistVisualLayers } from "./layer-store";
import { requireVisualAccess } from "./store";

jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		site: { findFirst: jest.fn(), updateMany: jest.fn() },
	},
}));

beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "limeni" } as never);
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		siteDiaryRecordsMap: {
			Works: { DropDownOptions: { XPS: "XPS" } },
			otherSettings: { existing: "preserve" },
		},
	} as never);
	jest.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 });
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (
			callback: (tx: typeof prisma) => Promise<unknown>,
		) => callback(prisma)) as never);
});

it("updates only the authorized project's layer JSON while retaining rates and other settings", async () => {
	const previous = defaultVisualLayerSettings();
	const next = visualLayerSettingsSchema.parse(previous);
	next.categories[0].label = "Smilšu kārta";
	expect(await persistVisualLayers("user", "site", next, previous)).toEqual(
		next,
	);
	expect(requireVisualAccess).toHaveBeenCalledWith("user", "site");
	expect(prisma.site.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ id: "site", organizationId: "limeni" }),
			data: {
				siteDiaryRecordsMap: {
					Works: { DropDownOptions: { XPS: "XPS" } },
					otherSettings: {
						existing: "preserve",
						[VISUAL_LAYERS_SETTINGS_KEY]: next,
					},
				},
			},
		}),
	);
});

it("blocks other organizations before reading or writing the project", async () => {
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("forbidden"));
	await expect(
		persistVisualLayers(
			"user",
			"site",
			defaultVisualLayerSettings(),
			defaultVisualLayerSettings(),
		),
	).rejects.toThrow("forbidden");
	expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("rejects stale settings instead of overwriting another user's changes", async () => {
	const current = defaultVisualLayerSettings();
	current.categories[0].label = "Changed";
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		siteDiaryRecordsMap: {
			otherSettings: { [VISUAL_LAYERS_SETTINGS_KEY]: current },
		},
	} as never);
	await expect(
		persistVisualLayers(
			"user",
			"site",
			defaultVisualLayerSettings(),
			defaultVisualLayerSettings(),
		),
	).rejects.toThrow("citā logā");
	expect(prisma.site.updateMany).not.toHaveBeenCalled();
});

it("detects an unrelated concurrent configuration edit with a compare-and-swap", async () => {
	jest.mocked(prisma.site.updateMany).mockResolvedValue({ count: 0 });
	await expect(
		persistVisualLayers(
			"user",
			"site",
			defaultVisualLayerSettings(),
			defaultVisualLayerSettings(),
		),
	).rejects.toThrow("Projekta iestatījumi");
});

it("requires a replacement on deletion, and does not write any drawings or diary records", async () => {
	const previous = defaultVisualLayerSettings();
	const next = visualLayerSettingsSchema.parse(previous);
	next.categories = next.categories.filter((c) => c.id !== "xps");
	await expect(
		persistVisualLayers("user", "site", next, previous),
	).rejects.toThrow("aizvietojums");
	expect(
		await persistVisualLayers(
			"user",
			"site",
			removeVisualLayer(previous, "xps", "sand"),
			previous,
		),
	).toHaveProperty("redirects.xps", "sand");
});
