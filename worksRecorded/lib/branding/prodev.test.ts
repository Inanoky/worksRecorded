import { isProdevOrganization } from "./prodev";

it.each(["ProDev", "PRO DEV", "SIA PRO DEV", "PRO DEV SIA", " pro-dev "])(
	"recognizes the ProDev organization name: %s",
	(name) => {
		expect(isProdevOrganization(name)).toBe(true);
	},
);

it.each([
	null,
	undefined,
	"",
	"FIMA",
	"ZTC",
	"Pro Development",
	"ProDev partner",
])("does not apply ProDev branding to another organization: %s", (name) => {
	expect(isProdevOrganization(name)).toBe(false);
});
