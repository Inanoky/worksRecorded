import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/utils/db";
import {
	loadZtcSiteConfiguration,
	saveZtcSiteConfiguration,
} from "./site-configuration";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findUnique: jest.fn(), update: jest.fn() },
		photos: { create: jest.fn(), createMany: jest.fn() },
		ztcSiteConfiguration: { findUnique: jest.fn(), upsert: jest.fn() },
	},
}));

it("reads and saves production configuration without touching construction settings", async () => {
	const config = { otherSettings: { ztcDefaultTaskRates: { projects: [] } } };
	await loadZtcSiteConfiguration("ztc-site");
	await saveZtcSiteConfiguration("ztc-site", config);
	expect(prisma.ztcSiteConfiguration.findUnique).toHaveBeenCalledWith({
		where: { siteId: "ztc-site" },
	});
	expect(prisma.ztcSiteConfiguration.upsert).toHaveBeenCalledWith({
		where: { siteId: "ztc-site" },
		create: { siteId: "ztc-site", siteDiaryRecordsMap: config },
		update: { siteDiaryRecordsMap: config },
	});
	expect(prisma.site.findUnique).not.toHaveBeenCalled();
	expect(prisma.site.update).not.toHaveBeenCalled();
});

it.each(["whatsapp-worker.ts", "whatsapp-quality.ts"])(
	"keeps %s photo writes out of the construction table",
	(file) => {
		const source = readFileSync(join(__dirname, file), "utf8");
		expect(source).not.toMatch(/prisma\.photos\./);
		expect(source).toMatch(/prisma\.ztcPhoto\./);
	},
);
