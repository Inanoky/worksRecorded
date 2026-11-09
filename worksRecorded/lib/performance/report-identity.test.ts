import {
	assertComparablePerformanceReports,
	getPerformanceReportIdentity,
} from "./report-identity";

const report = (coldProjectCache?: boolean) => ({
	benchmark: {
		id: "default-construction-core",
		flowKey: "default-construction",
		scenario: "projects-diary-warehouse",
		projectId: "site",
		...(coldProjectCache === undefined ? {} : { coldProjectCache }),
	},
});

it("treats historical fresh-context reports as cold-cache reports", () => {
	expect(getPerformanceReportIdentity(report()).coldProjectCache).toBe(true);
	expect(() =>
		assertComparablePerformanceReports(report(), report(true)),
	).not.toThrow();
});

it("refuses to compare cold and preserved project-cache runs", () => {
	expect(() =>
		assertComparablePerformanceReports(report(true), report(false)),
	).toThrow("different benchmark targets");
});
