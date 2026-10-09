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
	const initialMap = await page.getByTestId("visual-viewport").boundingBox();
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
	const panel = await page
		.getByRole("complementary", { name: "Izvēlētās zonas informācija" })
		.boundingBox();
	const editor = await page
		.getByLabel("Darba tips", { exact: true })
		.boundingBox();
	assert(
		editor.y >= panel.y && editor.y + editor.height <= panel.y + panel.height,
	);
	const selectedMap = await page.getByTestId("visual-viewport").boundingBox();
	assert.equal(selectedMap.width, initialMap.width);
	assert.equal(selectedMap.x, initialMap.x);
	assert(panel.x + panel.width <= selectedMap.x + selectedMap.width);
	assert(panel.x > selectedMap.x);
	assert.equal(
		await page.locator('[data-slot="hover-card-content"]').count(),
		0,
	);
	if (process.argv[2])
		await page.screenshot({ path: process.argv[2], fullPage: true });
	await page.getByRole("button", { name: "Aizvērt zonas informāciju" }).click();
	assert.equal(await selected.count(), 0);
	await page
		.getByRole("button", { name: /^XPS: Aptuvena/ })
		.first()
		.click();
	const card = await page
		.getByText("Izpildshēmas — darbu slāņi", { exact: true })
		.boundingBox();
	assert(card.x >= 0 && card.x + card.width <= 1440);
	await page.setViewportSize({ width: 768, height: 1000 });
	await page.getByLabel("Darba tips", { exact: true }).waitFor();
	const tabletPanel = await page
		.getByRole("complementary", { name: "Izvēlētās zonas informācija" })
		.boundingBox();
	assert(tabletPanel.x >= 0 && tabletPanel.x + tabletPanel.width <= 768);
	assert.equal(pdfRequests, 1);
	assert.deepEqual(errors, []);
	console.log(
		"Verified right-side zone panel, closing/reselection, unchanged map width, work-type save/recolor, one PDF load and desktop/tablet layout; no database or AI calls.",
	);
} finally {
	await browser.close();
}
