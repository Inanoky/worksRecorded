import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.PERF_BASE_URL;
const authFile = resolve(
	process.env.PERF_AUTH_FILE ?? "playwright/.auth/performance-user.json",
);

if (!baseURL) {
	throw new Error("PERF_BASE_URL is required.");
}

async function main() {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();

	await page.goto(new URL("/api/auth/login", baseURL as string).toString());
	console.log(
		"Complete login in the browser. The session will be saved after the dashboard opens.",
	);
	await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 5 * 60 * 1000 });
	await page.locator('[data-performance-ready="projects-list"]').waitFor({
		state: "visible",
		timeout: 120_000,
	});
	await mkdir(dirname(authFile), { recursive: true });
	await context.storageState({ path: authFile });
	await browser.close();

	console.log(`Saved performance-test authentication to ${authFile}`);
}

void main();
