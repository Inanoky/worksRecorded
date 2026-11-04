import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
	type Browser,
	type BrowserContext,
	expect,
	type Page,
	test,
} from "@playwright/test";

type RunResult = {
	run: number;
	metrics: Record<string, number>;
};

const baseURL = process.env.PERF_BASE_URL as string;
const projectId = process.env.PERF_PROJECT_ID;
const authFile = resolve(
	process.env.PERF_AUTH_FILE ?? "playwright/.auth/performance-user.json",
);
const runs = Number.parseInt(process.env.PERF_RUNS ?? "5", 10);
const runLabel = (
	process.env.PERF_RUN_LABEL ?? new Date().toISOString()
).replace(/[^a-zA-Z0-9_-]+/g, "-");
const includeLogin = process.env.PERF_INCLUDE_LOGIN === "true";
const loginEmail = process.env.PERF_LOGIN_EMAIL;
const loginPassword = process.env.PERF_LOGIN_PASSWORD;

const projectsReady = '[data-performance-ready="projects-list"]';
const diaryReady = '[data-performance-ready="project-diary"]';
const warehouseReady = '[data-performance-ready="warehouse"]';

function percentile(values: number[], percentileValue: number) {
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

async function measure(action: () => Promise<void>) {
	const startedAt = performance.now();
	await action();
	return Math.round(performance.now() - startedAt);
}

async function waitForReady(page: Page, url: RegExp, selector: string) {
	await page.waitForURL(url);
	await expect(page.locator(selector)).toBeVisible({ timeout: 120_000 });
}

async function measureNavigation(
	page: Page,
	action: () => Promise<unknown>,
	url: RegExp,
	selector: string,
) {
	return measure(async () => {
		await action();
		await waitForReady(page, url, selector);
	});
}

async function createAuthenticatedContext(browser: Browser) {
	if (!includeLogin) {
		return browser.newContext({ storageState: authFile });
	}

	if (!loginEmail || !loginPassword) {
		throw new Error(
			"PERF_LOGIN_EMAIL and PERF_LOGIN_PASSWORD are required when PERF_INCLUDE_LOGIN=true.",
		);
	}

	return browser.newContext();
}

async function logIn(page: Page, metrics: Record<string, number>) {
	metrics.login_page_visible_ms = await measure(async () => {
		await page.goto(new URL("/api/auth/login", baseURL).toString());
		await page.locator('input[type="email"]').waitFor({ state: "visible" });
	});

	await page.locator('input[type="email"]').fill(loginEmail as string);
	const passwordInput = page.locator('input[type="password"]');
	if (!(await passwordInput.isVisible())) {
		await page.locator('button[type="submit"]').click();
		await passwordInput.waitFor({ state: "visible" });
	}
	await passwordInput.fill(loginPassword as string);

	metrics.login_submit_to_projects_ms = await measure(async () => {
		await page.locator('button[type="submit"]').click();
		await waitForReady(page, /\/dashboard(?:\?.*)?$/, projectsReady);
	});
}

async function runJourney(
	context: BrowserContext,
	run: number,
): Promise<RunResult> {
	const page = await context.newPage();
	const metrics: Record<string, number> = {};
	const diaryUrl = new RegExp(
		`/dashboard/sites/${projectId}/dashboard(?:\\?.*)?$`,
	);
	const warehouseUrl = new RegExp(
		`/dashboard/sites/${projectId}/BIS(?:\\?.*)?$`,
	);
	const diaryHref = `/dashboard/sites/${projectId}/dashboard`;
	const warehouseHref = `/dashboard/sites/${projectId}/BIS`;

	if (includeLogin) {
		await logIn(page, metrics);
	} else {
		metrics.projects_cold_load_ms = await measure(async () => {
			await page.goto(new URL("/dashboard", baseURL).toString());
			await waitForReady(page, /\/dashboard(?:\?.*)?$/, projectsReady);
		});
	}

	metrics.project_first_open_ms = await measureNavigation(
		page,
		() => page.locator(`a[href="${diaryHref}"]`).first().click(),
		diaryUrl,
		diaryReady,
	);

	metrics.warehouse_first_open_ms = await measureNavigation(
		page,
		() => page.locator(`a[href="${warehouseHref}"]`).first().click(),
		warehouseUrl,
		warehouseReady,
	);

	for (let cycle = 1; cycle <= 3; cycle += 1) {
		metrics[`warehouse_to_diary_${cycle}_ms`] = await measureNavigation(
			page,
			() => page.locator(`a[href="${diaryHref}"]`).first().click(),
			diaryUrl,
			diaryReady,
		);
		metrics[`diary_to_warehouse_${cycle}_ms`] = await measureNavigation(
			page,
			() => page.locator(`a[href="${warehouseHref}"]`).first().click(),
			warehouseUrl,
			warehouseReady,
		);
	}

	metrics.browser_back_to_diary_ms = await measureNavigation(
		page,
		() => page.goBack(),
		diaryUrl,
		diaryReady,
	);
	metrics.browser_forward_to_warehouse_ms = await measureNavigation(
		page,
		() => page.goForward(),
		warehouseUrl,
		warehouseReady,
	);
	metrics.warehouse_hard_reload_ms = await measureNavigation(
		page,
		() => page.reload(),
		warehouseUrl,
		warehouseReady,
	);

	await page.locator(`a[href="${diaryHref}"]`).first().click();
	await waitForReady(page, diaryUrl, diaryReady);
	metrics.diary_hard_reload_ms = await measureNavigation(
		page,
		() => page.reload(),
		diaryUrl,
		diaryReady,
	);

	await context.close();
	return { run, metrics };
}

function buildMarkdown(results: RunResult[]) {
	const metricNames = Array.from(
		new Set(results.flatMap((result) => Object.keys(result.metrics))),
	).sort();
	const rows = metricNames.map((name) => {
		const values = results
			.map((result) => result.metrics[name])
			.filter((value): value is number => value !== undefined);
		return `| ${name} | ${values.length} | ${percentile(values, 50)} | ${percentile(values, 75)} | ${percentile(values, 95)} |`;
	});

	return [
		"# Production performance journey",
		"",
		`Generated: ${new Date().toISOString()}`,
		`Target: ${new URL(baseURL).origin}`,
		`Project: ${projectId}`,
		`Run label: ${runLabel}`,
		`Runs: ${results.length}`,
		"",
		"| Metric | Samples | P50 ms | P75 ms | P95 ms |",
		"| --- | ---: | ---: | ---: | ---: |",
		...rows,
		"",
	].join("\n");
}

test("authenticated projects, diary, and warehouse journey", async ({
	browser,
}, testInfo) => {
	test.skip(!projectId, "PERF_PROJECT_ID is required.");
	test.skip(
		!Number.isFinite(runs) || runs < 1,
		"PERF_RUNS must be a positive integer.",
	);

	const results: RunResult[] = [];
	for (let run = 1; run <= runs; run += 1) {
		const context = await createAuthenticatedContext(browser);
		results.push(await runJourney(context, run));
	}

	const resultDirectory = resolve(".performance-results");
	await mkdir(resultDirectory, { recursive: true });
	const jsonPath = resolve(
		resultDirectory,
		`customer-journey-${runLabel}.json`,
	);
	const markdownPath = resolve(
		resultDirectory,
		`customer-journey-${runLabel}.md`,
	);
	await writeFile(
		jsonPath,
		`${JSON.stringify({ generatedAt: new Date().toISOString(), runLabel, baseURL, projectId, results }, null, 2)}\n`,
	);
	await writeFile(markdownPath, buildMarkdown(results));
	await testInfo.attach("customer-journey-summary", {
		path: markdownPath,
		contentType: "text/markdown",
	});
});
