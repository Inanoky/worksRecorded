import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1000 },
	});
	const errors = [];
	let pdfRequests = 0;
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("request", (request) => {
		if (request.url().endsWith("/plan.pdf")) pdfRequests++;
	});
	await page.goto("http://127.0.0.1:4318");
	await page.getByRole("combobox", { name: "Lokācija" }).click();
	await page.getByRole("option", { name: "1. stāvs", exact: true }).click();
	await page.locator("polygon").first().waitFor();
	await page.getByRole("button", { name: /^Smilts: Aptuvena/ }).click();
	await page.mouse.move(1300, 100);
	const selected = page.locator('button[aria-pressed="true"]');
	assert.equal(await selected.count(), 1);
	assert.equal(
		await page.locator("polygon").last().getAttribute("stroke"),
		"#0f172a",
	);
	assert.equal(
		await page.locator("polygon").last().getAttribute("stroke-width"),
		"4",
	);
	await page
		.getByLabel("Darba tips", { exact: true })
		.selectOption("XPS izolācija 150 mm");
	await page.getByRole("button", { name: "Saglabāt", exact: true }).click();
	await page
		.getByText("Darba tips saglabāts žurnālā un visās ieraksta zonās.")
		.waitFor();
	assert.equal(await selected.count(), 1);
	assert.equal(
		await page.locator("polygon").last().getAttribute("fill"),
		"#eab308",
	);
	assert.equal(pdfRequests, 1);
	assert.deepEqual(errors, []);
	const sidebar = await page
		.getByRole("complementary", { name: "Darbu slāņi un avoti" })
		.boundingBox();
	const editor = await page
		.getByLabel("Darba tips", { exact: true })
		.boundingBox();
	assert(
		editor.y >= sidebar.y &&
			editor.y + editor.height <= sidebar.y + sidebar.height,
	);
	const card = await page
		.getByText("Izpildshēmas — darbu slāņi", { exact: true })
		.boundingBox();
	assert(card.x >= 0 && card.x + card.width <= 1440);
	await page.setViewportSize({ width: 768, height: 1000 });
	await page.getByLabel("Darba tips", { exact: true }).waitFor();
	assert.deepEqual(errors, []);
	console.log(
		"Verified synthetic map selection, work-type save/recolor, one PDF load, visible editor and tablet layout; no database or AI calls.",
	);
} finally {
	await browser.close();
}
