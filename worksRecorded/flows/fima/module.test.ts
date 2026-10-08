import {
	getFlowModuleByKey,
	getFlowModules,
	shouldShowDashboardAiWidgetForFlowModule,
} from "@/lib/flows/registry";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";

describe("FIMA flow registration", () => {
	it("is an assignable construction flow with a BIS dashboard label", () => {
		const flow = getFlowModuleByKey(FLOW_MODULE_KEYS.FIMA);
		expect(flow?.category).toBe("construction");
		expect(flow?.ui?.projectNavigation?.dashboard?.labelLv).toBe(
			"BIS pārskats",
		);
		expect(flow?.entryPoints.frontend).toContain("flows/fima/frontend.ts");
		expect(
			shouldShowDashboardAiWidgetForFlowModule(FLOW_MODULE_KEYS.FIMA),
		).toBe(false);
	});

	it("preserves unique flow keys and the existing construction fallback", () => {
		const modules = getFlowModules();
		expect(new Set(modules.map((flow) => flow.key)).size).toBe(modules.length);
		expect(
			getFlowModuleByKey(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION)?.clientFlowId,
		).toBe("default");
		expect(getFlowModuleByKey("unknown-flow")).toBeNull();
	});
});
