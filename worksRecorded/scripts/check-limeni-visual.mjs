import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1000 },
	});
	const errors = [];
	await page.route("https://visual-preview.test/**", async (route) => {
		const response = await page.request.get(
			`http://127.0.0.1:4318${new URL(route.request().url()).pathname}`,
		);
		await route.fulfill({ response });
	});
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
	const workspace = page.getByTestId("visual-workspace");
	const assertFits = async () => {
		const box = await workspace.boundingBox();
		const viewport = page.viewportSize();
		assert(box.x >= 0 && box.x + box.width <= viewport.width);
		assert(box.y >= 0 && box.y + box.height <= viewport.height);
		assert(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		);
		assert(
			await page
				.getByTestId("visual-viewport")
				.evaluate((element) => getComputedStyle(element).overflow === "hidden"),
		);
		assert(
			await page.evaluate(
				() => document.documentElement.scrollHeight <= window.innerHeight,
			),
		);
	};
	await assertFits();
	assert(
		await page
			.getByTestId("visual-sidebar-list")
			.evaluate((element) => element.scrollHeight <= element.clientHeight),
	);
	await page.getByRole("button", { name: "Zonu avoti", exact: true }).click();
	assert(
		await page
			.getByTestId("visual-sidebar-list")
			.evaluate((element) => element.scrollHeight <= element.clientHeight),
	);
	await page.getByRole("button", { name: "Paslēpt slāņus un avotus" }).click();
	await page.getByRole("button", { name: /^Smilts: Aptuvena/ }).click();
	await page.mouse.move(1300, 100);
	const selected = page
		.getByTestId("visual-viewport")
		.locator('button[aria-pressed="true"]');
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
	const sourceImage = page
		.getByRole("complementary", { name: "Izvēlētās zonas informācija" })
		.getByRole("button", { name: "Ziņojuma foto 1" });
	const imageBox = await sourceImage.boundingBox();
	assert(imageBox.width >= panel.width - 20);
	assert(imageBox.height > panel.height / 2);
	assert(imageBox.y < editor.y);
	assert.equal(
		await sourceImage
			.locator("img")
			.evaluate((image) => getComputedStyle(image).objectFit),
		"contain",
	);
	await sourceImage.click();
	const photoDialog = page.getByRole("dialog");
	await photoDialog
		.getByRole("button", { name: "Pietuvināt", exact: true })
		.click();
	assert.equal(
		await photoDialog.getByLabel("Tālummaiņa", { exact: true }).textContent(),
		"150%",
	);
	await photoDialog.getByRole("button", { name: "Close", exact: true }).click();
	await page
		.locator('[data-slot="dialog-content"]')
		.waitFor({ state: "hidden" });
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
	await assertFits();
	await page.setViewportSize({ width: 768, height: 1000 });
	await page.getByLabel("Darba tips", { exact: true }).waitFor();
	const tabletPanel = await page
		.getByRole("complementary", { name: "Izvēlētās zonas informācija" })
		.boundingBox();
	assert(tabletPanel.x >= 0 && tabletPanel.x + tabletPanel.width <= 768);
	const tabletImage = await sourceImage.boundingBox();
	assert(tabletImage.height > tabletPanel.height / 2);
	await assertFits();
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.waitForTimeout(250);
	await assertFits();
	await page.getByRole("button", { name: "Aizvērt zonas informāciju" }).click();
	await page.getByRole("button", { name: "Rādīt slāņus un avotus" }).click();
	assert(
		await page
			.getByTestId("visual-sidebar-list")
			.evaluate((element) => element.scrollHeight <= element.clientHeight),
	);
	await page.getByRole("button", { name: "Rasējuma iestatījumi" }).click();
	await page.getByRole("button", { name: "Dzēst rasējumu" }).waitFor();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Paslēpt slāņus un avotus" }).click();
	const canvas = page.getByTestId("visual-viewport");
	const canvasBox = await canvas.boundingBox();
	const centerX = canvasBox.x + canvasBox.width * 0.55;
	const centerY = canvasBox.y + canvasBox.height * 0.55;
	await page.mouse.move(centerX, centerY);
	await page.mouse.wheel(0, -500);
	await page.waitForTimeout(400);
	assert.notEqual(await page.getByText("100%", { exact: true }).count(), 1);
	const beforePan = await page
		.locator("canvas")
		.evaluate((element) => element.parentElement.style.transform);
	await page.mouse.down();
	await page.mouse.move(centerX + 80, centerY + 50, { steps: 8 });
	await page.mouse.up();
	await page.waitForTimeout(250);
	assert.notEqual(
		await page
			.locator("canvas")
			.evaluate((element) => element.parentElement.style.transform),
		beforePan,
	);
	await assertFits();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(250);
	await assertFits();
	assert.equal(pdfRequests, 1);
	assert.deepEqual(errors, []);
	console.log(
		"Verified fixed CAD workspace without page scrollbars, layer/source pagination without nested scrollbars, wheel zoom and drag-to-pan, image-first source panel and photo zoom, closing/reselection, work-type save/recolor, one PDF load, and desktop/tablet/laptop/mobile layout; no database or AI calls.",
	);
} finally {
	await browser.close();
}
