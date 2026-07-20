const redirectMock = jest.fn((url: string) => {
	const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
	error.digest = `NEXT_REDIRECT;replace;${url}`;
	throw error;
});

jest.mock("next/navigation", () => ({
	redirect: redirectMock,
}));

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: {
			findUnique: jest.fn(),
		},
		organization: {
			findUnique: jest.fn(),
		},
		site: {
			create: jest.fn(),
			findMany: jest.fn(),
		},
		subscription: {
			findUnique: jest.fn(),
		},
	},
}));

jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: jest.fn(),
}));

jest.mock("@/lib/utils/stripe", () => ({
	stripe: {
		customers: {
			create: jest.fn(),
		},
		checkout: {
			sessions: {
				create: jest.fn(),
			},
		},
	},
}));

import defaultConfigLV from "@/components/sitediary/configs/defaultConfigLV_27042026.json";
import { defaultProgram } from "@/lib/utils/DefaultProgram";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { CreateSiteAction } from "./shared-actions";

beforeAll(() => {
	if (!globalThis.structuredClone) {
		globalThis.structuredClone = <T>(value: T) =>
			JSON.parse(JSON.stringify(value)) as T;
	}
});

function createSiteFormData(
	overrides: Partial<
		Record<"name" | "description" | "subdirectory", string>
	> = {},
) {
	const formData = new FormData();
	formData.set("name", overrides.name ?? "Jauns projekts");
	formData.set("description", overrides.description ?? "Projekta apraksts");
	formData.set("subdirectory", overrides.subdirectory ?? "Brivibas 10");
	return formData;
}

describe("CreateSiteAction", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		jest.mocked(requireUser).mockResolvedValue({
			id: "user-1",
		} as Awaited<ReturnType<typeof requireUser>>);

		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			organizationId: "org-1",
		});

		jest.mocked(prisma.organization.findUnique).mockResolvedValue({
			orgLanguage: "lv",
		});
	});

	it("creates another site for a user without checking subscription or existing site count", async () => {
		await expect(
			CreateSiteAction(undefined, createSiteFormData()),
		).rejects.toMatchObject({
			digest: "NEXT_REDIRECT;replace;/dashboard/sites",
		});

		expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
		expect(prisma.site.findMany).not.toHaveBeenCalled();
		expect(prisma.site.create).toHaveBeenCalledWith({
			data: {
				description: "Projekta apraksts",
				name: "Jauns projekts",
				subdirectory: "Brivibas 10",
				userId: "user-1",
				organizationId: "org-1",
				siteDiaryRecordsMap: defaultConfigLV,
				sitediarysettings: {
					create: {
						userId: "user-1",
						organizationId: "org-1",
						schema: JSON.stringify(defaultProgram),
					},
				},
			},
		});
		expect(redirectMock).toHaveBeenCalledWith("/dashboard/sites");
	});

	it("returns validation errors without creating a site", async () => {
		const result = await CreateSiteAction(
			undefined,
			createSiteFormData({ name: "" }),
		);

		expect(result).toEqual(
			expect.objectContaining({
				status: "error",
			}),
		);
		expect(prisma.site.create).not.toHaveBeenCalled();
		expect(redirectMock).not.toHaveBeenCalled();
	});
});
