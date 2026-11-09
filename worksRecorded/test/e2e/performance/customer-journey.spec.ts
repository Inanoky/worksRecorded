import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
	type Browser,
	type BrowserContext,
	expect,
	type Page,
	type Request,
	test,
} from "@playwright/test";
import { getPerformanceBenchmarkTarget } from "./benchmark-targets";

type NetworkRequestResult = {
	journeyPhase: string;
	url: string;
	method: string;
	resourceType: string;
	status: number | null;
	durationMs: number;
	dnsMs: number;
	connectMs: number;
	tlsMs: number;
	ttfbMs: number;
	downloadMs: number;
	responseBytes: number | null;
	cacheStatus: string | null;
	serverTiming: string | null;
	failure: string | null;
	likelyBottleneck: string;
};

type RunResult = {
	run: number;
	metrics: Record<string, number>;
	checks: JourneyCheck[];
	networkRequests: NetworkRequestResult[];
};

type JourneyCheck = {
	name: string;
	status: "passed";
	durationMs: number;
};

const benchmarkTarget = getPerformanceBenchmarkTarget(process.env.PERF_TARGET);
const baseURL = (process.env.PERF_BASE_URL ??
	benchmarkTarget?.baseURL) as string;
const projectId = process.env.PERF_PROJECT_ID ?? benchmarkTarget?.projectId;
const benchmarkId = (
	process.env.PERF_BENCHMARK_ID ??
	benchmarkTarget?.id ??
	"customer-journey"
).replace(/[^a-zA-Z0-9_-]+/g, "-");
const flowKey = process.env.PERF_FLOW_KEY ?? benchmarkTarget?.flowKey ?? null;
const projectName =
	process.env.PERF_PROJECT_NAME ?? benchmarkTarget?.projectName ?? null;
const secondaryProjectId =
	process.env.PERF_SECONDARY_PROJECT_ID ??
	benchmarkTarget?.secondaryProjectId ??
	null;
const secondaryProjectName =
	process.env.PERF_SECONDARY_PROJECT_NAME ??
	benchmarkTarget?.secondaryProjectName ??
	null;
const scenario =
	process.env.PERF_SCENARIO ??
	benchmarkTarget?.scenario ??
	"projects-diary-warehouse";
const expectedProjectApiPath =
	process.env.PERF_EXPECTED_PROJECT_API_PATH ??
	benchmarkTarget?.expectedProjectApiPath ??
	null;
const secondaryExpectedProjectApiPath =
	process.env.PERF_SECONDARY_EXPECTED_PROJECT_API_PATH ??
	benchmarkTarget?.secondaryExpectedProjectApiPath ??
	null;
const authFile = resolve(
	process.env.PERF_AUTH_FILE ?? "playwright/.auth/performance-user.json",
);
const runs = Number.parseInt(
	process.env.PERF_RUNS ?? String(benchmarkTarget?.defaultRuns ?? 5),
	10,
);
const cycles = Number.parseInt(
	process.env.PERF_CYCLES ?? String(benchmarkTarget?.defaultCycles ?? 3),
	10,
);
const runLabel = (
	process.env.PERF_RUN_LABEL ?? new Date().toISOString()
).replace(/[^a-zA-Z0-9_-]+/g, "-");
const includeLogin = process.env.PERF_INCLUDE_LOGIN === "true";
const loginEmail = process.env.PERF_LOGIN_EMAIL;
const loginPassword = process.env.PERF_LOGIN_PASSWORD;
const coldProjectCache = process.env.PERF_COLD_PROJECT_CACHE !== "false";
const projectCacheDatabase = "works-recorded-limeni-v1";

const projectsReady = '[data-performance-ready="projects-list"]';
const diaryReady = '[data-performance-ready="project-diary"]';
const warehouseReady = '[data-performance-ready="warehouse"]';
const forma2Heading = /^(Analītika|Analytics)$/;

function percentile(values: number[], percentileValue: number) {
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

function elapsed(start: number, end: number) {
	return start >= 0 && end >= start ? Math.round(end - start) : 0;
}

function sanitizeRequestUrl(value: string) {
	const url = new URL(value);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return url.protocol;
	}
	const queryKeys = Array.from(url.searchParams.keys()).sort();
	return `${url.origin}${url.pathname}${queryKeys.length ? `?${queryKeys.join("&")}` : ""}`;
}

function likelyBottleneck(
	result: Omit<NetworkRequestResult, "likelyBottleneck">,
) {
	if (result.failure) return "request failed";
	const networkMs = result.dnsMs + result.connectMs;
	if (result.responseBytes && result.responseBytes >= 1_000_000) {
		return "large payload";
	}
	if (
		result.responseBytes !== null &&
		result.responseBytes < 100_000 &&
		result.downloadMs >= 1_000
	) {
		return "server-streamed response wait";
	}
	if (
		result.ttfbMs >= 500 &&
		result.ttfbMs >= networkMs * 1.5 &&
		result.ttfbMs >= result.downloadMs * 1.5
	) {
		return "server, database, or upstream wait";
	}
	if (networkMs >= 300 && networkMs >= result.ttfbMs) {
		return "connection, DNS, or TLS";
	}
	if (result.downloadMs >= 500 && result.downloadMs >= result.ttfbMs) {
		return "response download";
	}
	return "mixed or fast";
}

function captureNetworkRequests(page: Page) {
	const records: NetworkRequestResult[] = [];
	const pending = new Set<Promise<void>>();
	const requestStartedAt = new WeakMap<Request, number>();
	const requestPhases = new WeakMap<Request, string>();
	let currentPhase = "setup";

	page.on("request", (request) => {
		requestStartedAt.set(request, performance.now());
		requestPhases.set(request, currentPhase);
	});

	page.on("requestfinished", (request) => {
		const task = (async () => {
			const response = await request.response();
			if (!response) return;
			const timing = request.timing();
			const durationMs = elapsed(0, timing.responseEnd);
			const sizes = await request.sizes().catch(() => null);
			const headers = response.headers();
			const partial = {
				journeyPhase: requestPhases.get(request) ?? currentPhase,
				url: sanitizeRequestUrl(request.url()),
				method: request.method(),
				resourceType: request.resourceType(),
				status: response.status(),
				durationMs,
				dnsMs: elapsed(timing.domainLookupStart, timing.domainLookupEnd),
				connectMs: elapsed(timing.connectStart, timing.connectEnd),
				tlsMs: elapsed(timing.secureConnectionStart, timing.connectEnd),
				ttfbMs: elapsed(timing.requestStart, timing.responseStart),
				downloadMs: elapsed(timing.responseStart, timing.responseEnd),
				responseBytes: sizes
					? sizes.responseBodySize + sizes.responseHeadersSize
					: null,
				cacheStatus: headers["x-vercel-cache"] ?? null,
				serverTiming: headers["server-timing"] ?? null,
				failure: null,
			};
			records.push({
				...partial,
				likelyBottleneck: likelyBottleneck(partial),
			});
		})();
		pending.add(task);
		void task.finally(() => pending.delete(task));
	});

	page.on("requestfailed", (request) => {
		const timing = request.timing();
		const startedAt = requestStartedAt.get(request);
		const partial = {
			journeyPhase: requestPhases.get(request) ?? currentPhase,
			url: sanitizeRequestUrl(request.url()),
			method: request.method(),
			resourceType: request.resourceType(),
			status: null,
			durationMs:
				startedAt === undefined
					? elapsed(0, timing.responseEnd)
					: Math.max(0, Math.round(performance.now() - startedAt)),
			dnsMs: elapsed(timing.domainLookupStart, timing.domainLookupEnd),
			connectMs: elapsed(timing.connectStart, timing.connectEnd),
			tlsMs: elapsed(timing.secureConnectionStart, timing.connectEnd),
			ttfbMs: elapsed(timing.requestStart, timing.responseStart),
			downloadMs: 0,
			responseBytes: null,
			cacheStatus: null,
			serverTiming: null,
			failure: request.failure()?.errorText ?? "unknown failure",
		};
		records.push({
			...partial,
			likelyBottleneck: likelyBottleneck(partial),
		});
	});

	return {
		records,
		setPhase(phase: string) {
			currentPhase = phase;
		},
		async finish() {
			await page.waitForTimeout(250);
			await Promise.allSettled(Array.from(pending));
		},
	};
}

async function measure(action: () => Promise<void>) {
	const startedAt = performance.now();
	await action();
	return Math.round(performance.now() - startedAt);
}

async function waitForReady(page: Page, url: RegExp, selector: string) {
	await page.waitForURL(url);
	await expect(page.locator(`${selector}:visible`).first()).toBeVisible({
		timeout: 120_000,
	});
}

async function checkedStage(
	checks: JourneyCheck[],
	name: string,
	action: () => Promise<void>,
) {
	return test.step(name, async () => {
		const startedAt = performance.now();
		try {
			await action();
		} catch (error) {
			throw new Error(`Journey stage failed: ${name}`, { cause: error });
		}
		const durationMs = Math.round(performance.now() - startedAt);
		checks.push({ name, status: "passed", durationMs });
		return durationMs;
	});
}

async function switchProjectFromDropdown(
	page: Page,
	targetProjectId: string,
	targetUrl: RegExp,
) {
	await page
		.getByRole("button", { name: /^(Mainīt projektu|Switch project)$/ })
		.click();
	await page
		.locator(
			`a[role="menuitem"][href="/dashboard/sites/${targetProjectId}/dashboard"]`,
		)
		.click();
	await waitForReady(page, targetUrl, diaryReady);
}

async function waitForInvoiceView(page: Page) {
	await expect(
		page.getByText(/^(Ielādē rēķinus\.\.\.|Loading invoices\.\.\.)$/),
	).toHaveCount(0, { timeout: 120_000 });
	await expect(
		page.getByText(
			/^(Neizdevās ielādēt rēķina datus\.|Invoice data could not be loaded\.)$/,
		),
	).toHaveCount(0);
	const invoiceDate = page.getByText(/^(Rēķina datums|Invoice date)$/).first();
	await expect(invoiceDate).toBeVisible({ timeout: 120_000 });
	return invoiceDate.locator("xpath=ancestor::button[1]");
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

async function clearProjectBrowserCache(page: Page) {
	await page.evaluate(
		(databaseName) =>
			new Promise<void>((resolve, reject) => {
				const timeout = window.setTimeout(
					() => reject(new Error("Project cache reset timed out")),
					5_000,
				);
				const request = indexedDB.deleteDatabase(databaseName);
				request.onsuccess = () => {
					window.clearTimeout(timeout);
					resolve();
				};
				request.onerror = () => {
					window.clearTimeout(timeout);
					reject(request.error ?? new Error("Project cache reset failed"));
				};
				request.onblocked = () => {
					window.clearTimeout(timeout);
					reject(new Error("Project cache reset was blocked"));
				};
			}),
		projectCacheDatabase,
	);
}

async function collectProjectBootstrapMetrics(page: Page, siteId: string) {
	const prefix = `limeni:${siteId}:`;
	return page.evaluate((markPrefix) => {
		const mark = (phase: string) =>
			window.performance.getEntriesByName(`${markPrefix}${phase}`).at(-1)
				?.startTime;
		const duration = (start: number | undefined, end: number | undefined) =>
			start !== undefined && end !== undefined && end >= start
				? Math.round(end - start)
				: undefined;
		const opening = mark("opening");
		const cacheStart = mark("cache-read-start");
		const cacheEnd = mark("cache-read-end");
		const requestStart = mark("sync-request-start");
		const response = mark("sync-response");
		const snapshot = mark("snapshot-published");
		const ready = window.performance.now();
		return {
			project_client_open_to_diary_ready_ms: duration(opening, ready),
			project_cache_lookup_ms: duration(cacheStart, cacheEnd),
			project_cache_to_sync_start_ms: duration(cacheEnd, requestStart),
			project_sync_request_ms: duration(requestStart, response),
			project_sync_response_to_snapshot_ms: duration(response, snapshot),
			project_snapshot_to_diary_ready_ms: duration(snapshot, ready),
		};
	}, prefix);
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

async function logIn(
	page: Page,
	metrics: Record<string, number>,
	setPhase: (phase: string) => void,
) {
	setPhase("login_page");
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

	setPhase("login_submit_to_projects");
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
	const networkCapture = captureNetworkRequests(page);
	const metrics: Record<string, number> = {};
	const checks: JourneyCheck[] = [];
	const diaryUrl = new RegExp(
		`/dashboard/sites/${projectId}/dashboard(?:\\?.*)?$`,
	);
	const secondaryDiaryUrl = secondaryProjectId
		? new RegExp(`/dashboard/sites/${secondaryProjectId}/dashboard(?:\\?.*)?$`)
		: null;
	const forma2Url = new RegExp(
		`/dashboard/sites/${projectId}/analytics(?:\\?.*)?$`,
	);
	const warehouseUrl = new RegExp(
		`/dashboard/sites/${projectId}/BIS(?:\\?.*)?$`,
	);
	const diaryHref = `/dashboard/sites/${projectId}/dashboard`;
	const forma2Href = `/dashboard/sites/${projectId}/analytics`;
	const warehouseHref = `/dashboard/sites/${projectId}/BIS`;

	console.log(`[performance] run ${run}/${runs}: opening projects`);
	if (includeLogin) {
		await logIn(page, metrics, networkCapture.setPhase);
	} else {
		networkCapture.setPhase("projects_cold_load");
		metrics.projects_cold_load_ms = await checkedStage(
			checks,
			"dashboard project list ready",
			async () => {
				await page.goto(new URL("/dashboard", baseURL).toString());
				await waitForReady(page, /\/dashboard(?:\?.*)?$/, projectsReady);
			},
		);
	}
	if (coldProjectCache) {
		networkCapture.setPhase("project_cache_reset");
		metrics.project_cache_reset_ms = await measure(() =>
			clearProjectBrowserCache(page),
		);
	}

	console.log(`[performance] run ${run}/${runs}: opening project diary`);
	networkCapture.setPhase("project_first_open");
	metrics.project_first_open_ms = await checkedStage(
		checks,
		"primary project cold diary ready",
		async () => {
			await page.locator(`a[href="${diaryHref}"]`).first().click();
			await waitForReady(page, diaryUrl, diaryReady);
		},
	);
	const bootstrapMetrics = await collectProjectBootstrapMetrics(
		page,
		projectId as string,
	);
	for (const [name, value] of Object.entries(bootstrapMetrics)) {
		if (value !== undefined) metrics[name] = value;
	}

	if (secondaryProjectId && secondaryDiaryUrl) {
		console.log(`[performance] run ${run}/${runs}: switching projects`);
		networkCapture.setPhase("primary_to_secondary_project");
		metrics.primary_to_secondary_project_ms = await checkedStage(
			checks,
			`secondary project ${secondaryProjectName ?? secondaryProjectId} diary ready`,
			() =>
				switchProjectFromDropdown(page, secondaryProjectId, secondaryDiaryUrl),
		);
		networkCapture.setPhase("secondary_to_primary_project");
		metrics.secondary_to_primary_project_ms = await checkedStage(
			checks,
			"primary project diary ready after project switch",
			() => switchProjectFromDropdown(page, projectId as string, diaryUrl),
		);
	}

	console.log(`[performance] run ${run}/${runs}: opening Forma 2`);
	networkCapture.setPhase("diary_to_forma2");
	metrics.diary_to_forma2_ms = await checkedStage(
		checks,
		"Forma 2 ready",
		async () => {
			await page.locator(`a[href="${forma2Href}"]`).first().click();
			await page.waitForURL(forma2Url);
			await expect(
				page.getByRole("heading", { name: forma2Heading }),
			).toBeVisible({
				timeout: 120_000,
			});
		},
	);
	networkCapture.setPhase("forma2_to_diary");
	metrics.forma2_to_diary_ms = await checkedStage(
		checks,
		"project diary ready after Forma 2",
		async () => {
			await page.locator(`a[href="${diaryHref}"]`).first().click();
			await waitForReady(page, diaryUrl, diaryReady);
		},
	);

	console.log(`[performance] run ${run}/${runs}: opening warehouse`);
	networkCapture.setPhase("warehouse_first_open");
	metrics.warehouse_first_open_ms = await checkedStage(
		checks,
		"warehouse ready",
		async () => {
			await page.locator(`a[href="${warehouseHref}"]`).first().click();
			await waitForReady(page, warehouseUrl, warehouseReady);
			await expect(
				page.getByRole("button", { name: /^(Materiāli|Materials)$/ }),
			).toBeVisible();
		},
	);

	networkCapture.setPhase("warehouse_materials_to_invoices");
	metrics.warehouse_materials_to_invoices_ms = await checkedStage(
		checks,
		"warehouse invoice list ready",
		async () => {
			await page.getByRole("button", { name: /^(Rēķini|Invoices)$/ }).click();
			const invoiceButton = await waitForInvoiceView(page);
			await invoiceButton.click();
			await expect(
				page.getByText(/^(Rēķina pozīcijas|Invoice rows)$/).first(),
			).toBeVisible({ timeout: 120_000 });
		},
	);

	networkCapture.setPhase("warehouse_invoice_to_materials");
	metrics.warehouse_invoice_to_materials_ms = await checkedStage(
		checks,
		"warehouse materials view restored",
		async () => {
			await page
				.getByRole("button", { name: /^(Materiāli|Materials)$/ })
				.click();
			await expect(page.locator(warehouseReady)).toBeVisible();
		},
	);

	networkCapture.setPhase("warehouse_invoice_cached_reopen");
	metrics.warehouse_invoice_cached_reopen_ms = await checkedStage(
		checks,
		"cached warehouse invoice rows reopen without refetch",
		async () => {
			await page.getByRole("button", { name: /^(Rēķini|Invoices)$/ }).click();
			const invoiceButton = await waitForInvoiceView(page);
			await expect(invoiceButton).toHaveAttribute("aria-expanded", "true");
			await invoiceButton.click();
			await expect(invoiceButton).toHaveAttribute("aria-expanded", "false");
			await invoiceButton.click();
			await expect(invoiceButton).toHaveAttribute("aria-expanded", "true");
			await expect(
				page.getByText(/^(Rēķina pozīcijas|Invoice rows)$/).first(),
			).toBeVisible();
			await page.waitForTimeout(500);
		},
	);

	for (let cycle = 1; cycle <= cycles; cycle += 1) {
		console.log(
			`[performance] run ${run}/${runs}: diary/warehouse cycle ${cycle}/${cycles}`,
		);
		networkCapture.setPhase(`warehouse_to_diary_${cycle}`);
		metrics[`warehouse_to_diary_${cycle}_ms`] = await measureNavigation(
			page,
			() => page.locator(`a[href="${diaryHref}"]`).first().click(),
			diaryUrl,
			diaryReady,
		);
		networkCapture.setPhase(`diary_to_warehouse_${cycle}`);
		metrics[`diary_to_warehouse_${cycle}_ms`] = await measureNavigation(
			page,
			() => page.locator(`a[href="${warehouseHref}"]`).first().click(),
			warehouseUrl,
			warehouseReady,
		);
	}

	console.log(`[performance] run ${run}/${runs}: browser history and reloads`);
	networkCapture.setPhase("browser_back_to_diary");
	metrics.browser_back_to_diary_ms = await measureNavigation(
		page,
		() => page.goBack(),
		diaryUrl,
		diaryReady,
	);
	networkCapture.setPhase("browser_forward_to_warehouse");
	metrics.browser_forward_to_warehouse_ms = await measureNavigation(
		page,
		() => page.goForward(),
		warehouseUrl,
		warehouseReady,
	);
	networkCapture.setPhase("warehouse_hard_reload");
	metrics.warehouse_hard_reload_ms = await measureNavigation(
		page,
		() => page.reload(),
		warehouseUrl,
		warehouseReady,
	);

	networkCapture.setPhase("diary_before_hard_reload");
	await page.locator(`a[href="${diaryHref}"]`).first().click();
	await waitForReady(page, diaryUrl, diaryReady);
	networkCapture.setPhase("diary_hard_reload");
	metrics.diary_hard_reload_ms = await measureNavigation(
		page,
		() => page.reload(),
		diaryUrl,
		diaryReady,
	);

	await networkCapture.finish();
	const expectedProjectApiObserved = expectedProjectApiPath
		? networkCapture.records.some((request) => {
				const url = new URL(request.url);
				return (
					url.pathname === expectedProjectApiPath &&
					request.method === "GET" &&
					request.status === 200 &&
					request.failure === null
				);
			})
		: true;
	const secondaryExpectedProjectApiObserved = secondaryExpectedProjectApiPath
		? networkCapture.records.some((request) => {
				const url = new URL(request.url);
				return (
					url.pathname === secondaryExpectedProjectApiPath &&
					request.method === "GET" &&
					request.status === 200 &&
					request.failure === null
				);
			})
		: true;
	const cachedInvoicePostRequests = networkCapture.records.filter((request) => {
		const url = new URL(request.url);
		return (
			request.journeyPhase === "warehouse_invoice_cached_reopen" &&
			request.method === "POST" &&
			url.pathname === `/dashboard/sites/${projectId}/BIS`
		);
	});
	metrics.warehouse_invoice_cached_reopen_post_requests =
		cachedInvoicePostRequests.length;
	await context.close();
	expect(
		expectedProjectApiObserved,
		`Expected a successful GET for ${expectedProjectApiPath} while measuring ${benchmarkId}.`,
	).toBe(true);
	expect(
		secondaryExpectedProjectApiObserved,
		`Expected a successful GET for ${secondaryExpectedProjectApiPath} while switching to ${secondaryProjectName ?? secondaryProjectId}.`,
	).toBe(true);
	expect(
		cachedInvoicePostRequests,
		"Reopening already-loaded invoice rows should not repeat a warehouse server-action request.",
	).toHaveLength(0);
	console.log(
		`[performance] run ${run}/${runs}: complete (${networkCapture.records.length} network requests saved)`,
	);
	return { run, metrics, checks, networkRequests: networkCapture.records };
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

	const networkRequests = results.flatMap((result) => result.networkRequests);
	const successfulRequests = networkRequests.filter(
		(request) => request.failure === null,
	);
	const failedRequests = networkRequests.filter(
		(request) => request.failure !== null,
	);
	const slowestRequests = [...successfulRequests]
		.sort((left, right) => right.durationMs - left.durationMs)
		.slice(0, 20);
	const requestGroups = new Map<string, NetworkRequestResult[]>();
	for (const request of successfulRequests) {
		const key = `${request.method} ${request.url}`;
		requestGroups.set(key, [...(requestGroups.get(key) ?? []), request]);
	}
	const divergentRequests = Array.from(requestGroups.entries())
		.map(([request, samples]) => {
			const durations = samples.map((sample) => sample.durationMs);
			const p50 = percentile(durations, 50);
			const maximum = Math.max(...durations);
			return {
				request,
				samples: samples.length,
				p50,
				maximum,
				ratio: maximum / Math.max(1, p50),
			};
		})
		.filter(
			(group) =>
				group.samples >= 2 && group.maximum >= 1_000 && group.ratio >= 2,
		)
		.sort((left, right) => right.ratio - left.ratio)
		.slice(0, 15);
	const failedRequestGroups = new Map<
		string,
		{ count: number; phases: Set<string> }
	>();
	for (const request of failedRequests) {
		const key = `${request.method} ${request.url} — ${request.failure}`;
		const group = failedRequestGroups.get(key) ?? {
			count: 0,
			phases: new Set<string>(),
		};
		group.count += 1;
		group.phases.add(request.journeyPhase);
		failedRequestGroups.set(key, group);
	}
	const phaseBytes = new Map<string, { requests: number; bytes: number }>();
	for (const request of successfulRequests) {
		const group = phaseBytes.get(request.journeyPhase) ?? {
			requests: 0,
			bytes: 0,
		};
		group.requests += 1;
		group.bytes += request.responseBytes ?? 0;
		phaseBytes.set(request.journeyPhase, group);
	}
	const checks = results.flatMap((result) =>
		result.checks.map((check) => ({ run: result.run, ...check })),
	);

	return [
		"# Production performance journey",
		"",
		`Generated: ${new Date().toISOString()}`,
		`Benchmark ID: ${benchmarkId}`,
		`Flow: ${flowKey ?? "unspecified"}`,
		`Scenario: ${scenario}`,
		`Target: ${new URL(baseURL).origin}`,
		`Project name: ${projectName ?? "unspecified"}`,
		`Project ID: ${projectId}`,
		`Secondary project name: ${secondaryProjectName ?? "not configured"}`,
		`Secondary project ID: ${secondaryProjectId ?? "not configured"}`,
		`Expected project API: ${expectedProjectApiPath ?? "not enforced"}`,
		`Expected secondary project API: ${secondaryExpectedProjectApiPath ?? "not enforced"}`,
		`Initial project cache: ${coldProjectCache ? "cold (IndexedDB cleared)" : "preserved"}`,
		`Run label: ${runLabel}`,
		`Runs: ${results.length}`,
		`Diary/warehouse cycles per run: ${cycles}`,
		"",
		"## Verified journey checks",
		"",
		"Each row passed its URL and usable-content readiness assertion. A failed check stops the run and is named in the Playwright report.",
		"",
		"| Run | Check | Status | Duration ms |",
		"| ---: | --- | --- | ---: |",
		...checks.map(
			(check) =>
				`| ${check.run} | ${check.name} | ${check.status} | ${check.durationMs} |`,
		),
		"",
		"| Metric | Samples | P50 ms | P75 ms | P95 ms |",
		"| --- | ---: | ---: | ---: | ---: |",
		...rows,
		"",
		"## Slowest requests",
		"",
		"Only successful requests are ranked here; navigation cancellations are listed separately.",
		"",
		"| Phase | Request | Status | Cache | Total ms | TTFB ms | Network ms | Download ms | KB | Likely bottleneck | Server timing |",
		"| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
		...slowestRequests.map(
			(request) =>
				`| ${request.journeyPhase} | ${request.method} ${request.url} | ${request.status ?? "—"} | ${request.cacheStatus ?? "—"} | ${request.durationMs} | ${request.ttfbMs} | ${request.dnsMs + request.connectMs} | ${request.downloadMs} | ${request.responseBytes === null ? "—" : Math.round(request.responseBytes / 1024)} | ${request.likelyBottleneck} | ${request.serverTiming ?? "—"} |`,
		),
		"",
		"## Successful request volume by phase",
		"",
		"| Phase | Requests | MB received |",
		"| --- | ---: | ---: |",
		...Array.from(phaseBytes.entries())
			.sort((left, right) => right[1].bytes - left[1].bytes)
			.map(
				([phase, group]) =>
					`| ${phase} | ${group.requests} | ${(group.bytes / 1_000_000).toFixed(2)} |`,
			),
		"",
		"## Divergent requests",
		"",
		"Requests appear here when the slowest sample is at least 1 second and twice the median.",
		"",
		"| Request | Samples | Median ms | Longest ms | Longest / median |",
		"| --- | ---: | ---: | ---: | ---: |",
		...divergentRequests.map(
			(group) =>
				`| ${group.request} | ${group.samples} | ${group.p50} | ${group.maximum} | ${group.ratio.toFixed(1)}× |`,
		),
		"",
		"## Failed or cancelled requests",
		"",
		"Failures are counted but excluded from latency rankings and divergence calculations.",
		"",
		"| Request and failure | Count | Journey phases |",
		"| --- | ---: | --- |",
		...Array.from(failedRequestGroups.entries())
			.sort((left, right) => right[1].count - left[1].count)
			.map(
				([request, group]) =>
					`| ${request.replaceAll("|", "\\|")} | ${group.count} | ${Array.from(group.phases).join(", ")} |`,
			),
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
	test.skip(
		!Number.isFinite(cycles) || cycles < 1,
		"PERF_CYCLES must be a positive integer.",
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
		`benchmark-${benchmarkId}-${runLabel}.json`,
	);
	const markdownPath = resolve(
		resultDirectory,
		`benchmark-${benchmarkId}-${runLabel}.md`,
	);
	const benchmark = {
		id: benchmarkId,
		flowKey,
		scenario,
		projectName,
		projectId,
		secondaryProjectName,
		secondaryProjectId,
		expectedProjectApiPath,
		secondaryExpectedProjectApiPath,
		coldProjectCache,
	};
	await writeFile(
		jsonPath,
		`${JSON.stringify({ generatedAt: new Date().toISOString(), runLabel, baseURL, benchmark, runs, cycles, results }, null, 2)}\n`,
	);
	await writeFile(markdownPath, buildMarkdown(results));
	await testInfo.attach("customer-journey-summary", {
		path: markdownPath,
		contentType: "text/markdown",
	});
});
