import { defineConfig, devices } from "@playwright/test";
import { getPerformanceBenchmarkTarget } from "./test/e2e/performance/benchmark-targets";

const benchmarkTarget = getPerformanceBenchmarkTarget(process.env.PERF_TARGET);
const baseURL = process.env.PERF_BASE_URL ?? benchmarkTarget?.baseURL;

if (!baseURL) {
	throw new Error(
		"PERF_BASE_URL is required for production performance tests.",
	);
}

if (!baseURL.startsWith("https://") && process.env.PERF_ALLOW_HTTP !== "true") {
	throw new Error("PERF_BASE_URL must use HTTPS unless PERF_ALLOW_HTTP=true.");
}

export default defineConfig({
	testDir: "./test/e2e/performance",
	testMatch: /.*\.spec\.ts/,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 15 * 60 * 1000,
	outputDir: ".performance-results/playwright-artifacts",
	reporter: [
		["line"],
		[
			"html",
			{ outputFolder: ".performance-results/playwright-report", open: "never" },
		],
	],
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		actionTimeout: 60_000,
		navigationTimeout: 120_000,
	},
	projects: [
		{
			name: "desktop-chrome",
			use: devices["Desktop Chrome"],
		},
	],
});
