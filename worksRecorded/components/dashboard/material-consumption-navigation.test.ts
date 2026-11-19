import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { getNavLinks } from "./NavLinks";

it("adds the materials overview to construction navigation", () => {
	expect(
		getNavLinks("lv", { flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION }),
	).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				name: "Materiālu patēriņš",
				href: "/dashboard/material-consumption",
			}),
		]),
	);
	expect(
		getNavLinks("lv", { flowModuleKey: FLOW_MODULE_KEYS.FIMA }).some(
			(link) => link.href === "/dashboard/material-consumption",
		),
	).toBe(false);
});
