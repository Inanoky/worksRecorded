export type PerformanceReportIdentityInput = {
	projectId?: string;
	benchmark?: {
		id: string;
		flowKey: string | null;
		scenario: string;
		projectId: string | undefined;
		coldProjectCache?: boolean;
	};
};

export function getPerformanceReportIdentity(
	report: PerformanceReportIdentityInput,
) {
	return {
		benchmarkId: report.benchmark?.id ?? "legacy-customer-journey",
		projectId: report.benchmark?.projectId ?? report.projectId,
		flowKey: report.benchmark?.flowKey ?? null,
		scenario: report.benchmark?.scenario ?? "projects-diary-warehouse",
		coldProjectCache: report.benchmark?.coldProjectCache ?? true,
	};
}

export function assertComparablePerformanceReports(
	before: PerformanceReportIdentityInput,
	after: PerformanceReportIdentityInput,
) {
	const beforeIdentity = getPerformanceReportIdentity(before);
	const afterIdentity = getPerformanceReportIdentity(after);
	if (
		beforeIdentity.benchmarkId !== afterIdentity.benchmarkId ||
		beforeIdentity.projectId !== afterIdentity.projectId ||
		beforeIdentity.flowKey !== afterIdentity.flowKey ||
		beforeIdentity.scenario !== afterIdentity.scenario ||
		beforeIdentity.coldProjectCache !== afterIdentity.coldProjectCache
	) {
		throw new Error(
			`Cannot compare different benchmark targets: ${JSON.stringify(beforeIdentity)} vs ${JSON.stringify(afterIdentity)}.`,
		);
	}
	return beforeIdentity;
}
