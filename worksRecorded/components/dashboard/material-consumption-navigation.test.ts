import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { getNavLinks } from "./NavLinks";

it("shows the materials overview for Limeni construction", () => {
	expect(
		getNavLinks("lv", {
			flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
			organizationId: LIMENI_ORGANIZATION_ID,
		}),
	).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				name: "Materiālu patēriņš",
				href: "/dashboard/material-consumption",
			}),
		]),
	);
});

it.each([...Object.values(FLOW_MODULE_KEYS), null])(
	"hides the materials overview from other organizations with flow %s",
	(flowModuleKey) => {
		expect(
			getNavLinks("lv", { flowModuleKey, organizationId: "other-org" }).some(
				(link) => link.href === "/dashboard/material-consumption",
			),
		).toBe(false);
	},
);

it("requires the construction flow even for the Limeni organization", () => {
	expect(
		getNavLinks("lv", {
			flowModuleKey: FLOW_MODULE_KEYS.FIMA,
			organizationId: LIMENI_ORGANIZATION_ID,
		}).some((link) => link.href === "/dashboard/material-consumption"),
	).toBe(false);
});
