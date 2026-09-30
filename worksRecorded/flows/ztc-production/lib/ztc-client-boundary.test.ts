jest.mock("@/flows/ztc-production/lib/ztc-record-audit", () => {
	throw new Error("Client diary utilities must not load server-only auditing");
});

jest.mock("@/lib/utils/db", () => {
	throw new Error("Client diary utilities must not load the database");
});

it("loads shared diary utilities without server-only dependencies", () => {
	jest.isolateModules(() => {
		const { getZtcPayrollValues } = require("./ztc-site-diary-utils");
		expect(
			getZtcPayrollValues({
				Date: "2026-09-30T08:00:00.000Z",
				Amounts: 10,
				Location_Custom_2: 2,
				Works_Custom_2: 1,
				WorkersInvolved: 1,
			}).sum,
		).toBe(20);
	});
});
