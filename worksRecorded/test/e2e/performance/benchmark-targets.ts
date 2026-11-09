export type PerformanceBenchmarkTarget = {
	id: string;
	description: string;
	baseURL: string;
	flowKey: string;
	projectId: string;
	projectName: string;
	scenario: string;
	expectedProjectApiPath: string;
	defaultRuns: number;
	defaultCycles: number;
};

const PERFORMANCE_BENCHMARK_TARGETS: Record<
	string,
	PerformanceBenchmarkTarget
> = {
	"default-construction-core": {
		id: "default-construction-core",
		description:
			"Default-construction project diary and warehouse customer journey",
		baseURL: "https://www.worksrecorded.com",
		flowKey: "default-construction",
		projectId: "dcbdc6fd-ded4-46db-9ac6-e1489298cce0",
		projectName: "Pļavas iela 2",
		scenario: "projects-diary-warehouse",
		expectedProjectApiPath:
			"/api/sites/dcbdc6fd-ded4-46db-9ac6-e1489298cce0/construction-project/bootstrap",
		defaultRuns: 5,
		defaultCycles: 3,
	},
};

export function getPerformanceBenchmarkTarget(targetId: string | undefined) {
	if (!targetId) return null;
	const target = PERFORMANCE_BENCHMARK_TARGETS[targetId];
	if (!target) {
		throw new Error(
			`Unknown PERF_TARGET "${targetId}". Available targets: ${Object.keys(PERFORMANCE_BENCHMARK_TARGETS).join(", ")}`,
		);
	}
	return target;
}
