import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { FullConfig, Page } from "@playwright/test";
import { chromium } from "playwright";
import { isPerformanceAuthRedirect } from "./auth-preflight-url";

const authFile = resolve(
	process.env.PERF_AUTH_FILE ?? "playwright/.auth/performance-user.json",
);
const projectsReady = '[data-performance-ready="projects-list"]';

async function authStateExists() {
	return access(authFile).then(
		() => true,
		() => false,
	);
}

async function inspectDashboard(page: Page, baseURL: string) {
	await page.goto(new URL("/dashboard", baseURL).toString(), {
		waitUntil: "domcontentloaded",
	});
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		if (isPerformanceAuthRedirect(page.url(), baseURL))
			return "unauthenticated" as const;
		if (
			await page
				.locator(projectsReady)
				.isVisible()
				.catch(() => false)
		)
			return "authenticated" as const;
		await page.waitForTimeout(250);
	}
	if (isPerformanceAuthRedirect(page.url(), baseURL))
		return "unauthenticated" as const;
	return "dashboard-unavailable" as const;
}

async function captureInteractiveAuthentication(baseURL: string) {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();
	try {
		await page.goto(new URL("/dashboard", baseURL).toString(), {
			waitUntil: "domcontentloaded",
		});
		console.log(
			"[performance] Authentication expired. Complete login in the opened browser window.",
		);
		await page.waitForURL(
			(url) =>
				url.origin === new URL(baseURL).origin &&
				url.pathname.startsWith("/dashboard"),
			{ timeout: 5 * 60 * 1000 },
		);
		await page.locator(projectsReady).waitFor({
			state: "visible",
			timeout: 120_000,
		});
		await mkdir(dirname(authFile), { recursive: true });
		await context.storageState({ path: authFile });
		console.log(`[performance] Saved refreshed authentication to ${authFile}`);
	} finally {
		await browser.close();
	}
}

export default async function performanceAuthPreflight(config: FullConfig) {
	if (process.env.PERF_INCLUDE_LOGIN === "true") return;
	const configuredBaseURL = config.projects[0]?.use.baseURL;
	if (typeof configuredBaseURL !== "string")
		throw new Error(
			"Performance auth preflight requires a configured baseURL.",
		);

	const browser = await chromium.launch({ headless: true });
	const hasAuthState = await authStateExists();
	const context = await browser.newContext(
		hasAuthState ? { storageState: authFile } : undefined,
	);
	const page = await context.newPage();
	let state: Awaited<ReturnType<typeof inspectDashboard>>;
	try {
		state = await inspectDashboard(page, configuredBaseURL);
	} finally {
		await browser.close();
	}

	if (state === "authenticated") {
		console.log("[performance] Authentication preflight passed.");
		return;
	}
	if (state === "dashboard-unavailable")
		throw new Error(
			"Performance auth preflight reached the app but the dashboard project list did not become ready within 60 seconds.",
		);
	if (process.env.PERF_AUTH_INTERACTIVE === "false")
		throw new Error(
			"Performance authentication is missing or expired. Run npm run perf:capture-auth or allow interactive auth preflight.",
		);

	await captureInteractiveAuthentication(configuredBaseURL);
}
