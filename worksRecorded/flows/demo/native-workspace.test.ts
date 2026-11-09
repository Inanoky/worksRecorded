import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { defaultConstructionFlowModule } from "@/flows/default-construction/module";
import { fimaDiaryColumns } from "@/lib/fima/diary-table";
import { demoFlowModule } from "./module";

const originalClone = globalThis.structuredClone;
beforeAll(() => {
	globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
});
afterAll(() => {
	globalThis.structuredClone = originalClone;
});

it("uses the original FIMA column definitions and enables the existing Limeni features", () => {
	const config = buildDefaultConstructionDiaryConfig({
		organizationId: LIMENI_ORGANIZATION_ID,
		siteDiaryRecordsMap: {
			...defaultConfig,
			otherSettings: {
				...defaultConfig.otherSettings,
				fimaCollaboration: true,
			},
		},
	});
	for (const { field, label, order, width } of fimaDiaryColumns) {
		expect(config[field]).toMatchObject({
			DisplayName: label,
			customSettings: {
				displayinSiteList: "yes",
				displayinSiteListOrder: order,
				displayinSiteListWidth: width,
			},
		});
	}
	expect(config.otherSettings).toMatchObject({
		inlineDiaryPhotos: true,
		visualConstruction: true,
	});
	expect(demoFlowModule.ui).toBe(defaultConstructionFlowModule.ui);
});
