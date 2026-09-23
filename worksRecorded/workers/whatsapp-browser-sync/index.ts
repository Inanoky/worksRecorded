import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import { UTApi } from "uploadthing/server";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";
import {
	buildClusterIdempotencyKey,
	clusterWhatsappMessages,
	extractPhone,
	type LoadedWhatsappMessage,
	parseWhatsappPrePlainText,
} from "./message-utils";
import {
	acquireWorkerLock,
	readBrowserSyncState,
	releaseWorkerLock,
	writeBrowserSyncState,
} from "./state";

const REQUIRED_ENV = [
	"WORKSRECORDED_BASE_URL",
	"WHATSAPP_BROWSER_SYNC_SECRET",
	"WHATSAPP_BROWSER_ORGANIZATION_ID",
] as const;

function requiredEnv(name: (typeof REQUIRED_ENV)[number]) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required`);
	return value;
}

function booleanEnv(name: string, fallback: boolean) {
	const value = process.env[name]?.trim().toLowerCase();
	if (!value) return fallback;
	return value === "true" || value === "1" || value === "yes";
}

function workerPaths() {
	const dataDirectory = path.resolve(
		process.env.WHATSAPP_BROWSER_DATA_DIR?.trim() || ".whatsapp-browser-sync",
	);
	return {
		dataDirectory,
		profileDirectory: path.resolve(
			process.env.WHATSAPP_BROWSER_PROFILE_DIR?.trim() ||
				path.join(dataDirectory, "profile"),
		),
		statePath: path.resolve(
			process.env.WHATSAPP_BROWSER_STATE_PATH?.trim() ||
				path.join(dataDirectory, "state.json"),
		),
		lockPath: path.join(dataDirectory, "worker.lock"),
		failureDirectory: path.resolve(
			process.env.WHATSAPP_BROWSER_FAILURE_DIR?.trim() ||
				path.join(dataDirectory, "failures"),
		),
	};
}

async function saveFailureScreenshot(page: Page, failureDirectory: string) {
	await mkdir(failureDirectory, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const screenshotPath = path.join(failureDirectory, `${stamp}.png`);
	await page.screenshot({ path: screenshotPath, fullPage: true });
	return screenshotPath;
}

async function ensureWhatsappReady(page: Page) {
	await page.goto("https://web.whatsapp.com/", {
		waitUntil: "domcontentloaded",
	});
	const useHere = page.getByRole("button", { name: "Use here" });
	if (await useHere.isVisible().catch(() => false)) await useHere.click();
	const search = page
		.getByRole("textbox", { name: /Search or start a new chat|Meklēt/i })
		.or(
			page.locator(
				'[data-testid="chat-list-search"], div[contenteditable="true"][role="textbox"]',
			),
		)
		.first();
	try {
		await search.waitFor({ state: "visible", timeout: 90_000 });
	} catch {
		throw new Error(
			"WhatsApp login is required; run the bootstrap command and scan the QR code",
		);
	}
	return search;
}

async function openGroup(page: Page, groupName: string) {
	const search = await ensureWhatsappReady(page);
	await search.fill(groupName);
	const row = page
		.getByTitle(groupName, { exact: true })
		.or(page.getByText(groupName, { exact: true }))
		.first();
	await row.waitFor({ state: "visible", timeout: 30_000 });
	await row.click();
	await page.locator("#main").waitFor({ state: "visible", timeout: 30_000 });
}

async function loadedMessageMetadata(page: Page) {
	const nodes = await page.locator("#main [data-id]").all();
	const byId = new Map<string, LoadedWhatsappMessage>();
	for (const node of nodes) {
		const sourceId = await node.getAttribute("data-id");
		if (!sourceId || byId.has(sourceId)) continue;
		const header = node.locator("[data-pre-plain-text]").first();
		const prePlainText = await header.getAttribute("data-pre-plain-text");
		const parsed = prePlainText
			? parseWhatsappPrePlainText(prePlainText)
			: null;
		if (!parsed) continue;
		const textParts = await node
			.locator('[data-testid="selectable-text"], span.selectable-text')
			.allTextContents();
		const text = [
			...new Set(textParts.map((part) => part.trim()).filter(Boolean)),
		].join("\n");
		const ariaLabels = await node
			.locator("[aria-label]")
			.evaluateAll((elements) =>
				elements.map((element) => element.getAttribute("aria-label") || ""),
			);
		const senderPhone =
			ariaLabels.map((label) => extractPhone(label)).find(Boolean) ??
			extractPhone(parsed.senderName);
		const hasImage =
			(await node.locator('img[src^="blob:"]').evaluateAll((images) =>
				images.some((image) => {
					const element = image as HTMLImageElement;
					return element.naturalWidth >= 160 && element.naturalHeight >= 120;
				}),
			)) || false;
		byId.set(sourceId, {
			sourceId,
			senderName: parsed.senderName,
			senderPhone,
			sentAt: parsed.sentAt,
			text,
			hasImage,
		});
	}
	return [...byId.values()];
}

async function readBlob(page: Page, source: string) {
	const result = await page.evaluate(async (blobUrl) => {
		const response = await fetch(blobUrl);
		const blob = await response.blob();
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = "";
		for (let index = 0; index < bytes.length; index += 0x8000) {
			binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
		}
		return { base64: btoa(binary), mimeType: blob.type || "image/jpeg" };
	}, source);
	return {
		buffer: Buffer.from(result.base64, "base64"),
		mimeType: result.mimeType,
	};
}

async function blobImages(scope: Locator) {
	const images = await scope.locator('img[src^="blob:"]').all();
	const candidates: Array<{ locator: Locator; source: string; area: number }> =
		[];
	for (const locator of images) {
		const candidate = await locator.evaluate((image) => {
			const element = image as HTMLImageElement;
			return {
				source: element.src,
				area: element.naturalWidth * element.naturalHeight,
			};
		});
		if (candidate.source && candidate.area >= 160 * 120) {
			candidates.push({
				locator,
				source: candidate.source,
				area: candidate.area,
			});
		}
	}
	return candidates.sort((left, right) => right.area - left.area);
}

async function downloadMessageImages(page: Page, sourceId: string) {
	const escapedSourceId = sourceId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	const message = page.locator(`#main [data-id="${escapedSourceId}"]`).first();
	const thumbnails = await blobImages(message);
	const downloaded: Array<{ buffer: Buffer; mimeType: string }> = [];
	for (const thumbnail of thumbnails.slice(0, 20)) {
		try {
			await thumbnail.locator.click();
			await page.waitForTimeout(750);
			const fullImage = (await blobImages(page.locator("body")))[0];
			const selected =
				fullImage && fullImage.area > thumbnail.area ? fullImage : thumbnail;
			downloaded.push(await readBlob(page, selected.source));
			await page.keyboard.press("Escape");
		} catch {
			await page.keyboard.press("Escape").catch(() => undefined);
			downloaded.push(await readBlob(page, thumbnail.source));
		}
	}
	return downloaded;
}

async function uploadImage(
	utapi: UTApi,
	sourceId: string,
	data: { buffer: Buffer; mimeType: string },
) {
	const extension =
		data.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
	const digest = createHash("sha256").update(data.buffer).digest("hex");
	const bytes = Uint8Array.from(data.buffer);
	const file = new File(
		[bytes.buffer],
		`whatsapp-browser-${digest.slice(0, 16)}.${extension}`,
		{ type: data.mimeType },
	);
	const uploaded = await utapi.uploadFiles(file);
	const result = Array.isArray(uploaded) ? uploaded[0] : uploaded;
	const url = result?.data ? getUploadThingFileUrl(result.data) : null;
	if (!url || result?.error) {
		throw new Error(`Failed to upload WhatsApp image for ${sourceId}`);
	}
	return { url, mimeType: data.mimeType, fileName: file.name, sha256: digest };
}

async function postCluster(args: {
	page: Page;
	cluster: LoadedWhatsappMessage[];
	groupName: string;
	organizationId: string;
	baseUrl: string;
	secret: string;
	utapi: UTApi;
}) {
	const attachments: Array<{
		url: string;
		mimeType: string;
		fileName: string;
		sha256: string;
	}> = [];
	const indexesBySourceId = new Map<string, number[]>();
	for (const message of args.cluster) {
		if (attachments.length >= 20) break;
		if (!message.hasImage) continue;
		const images = await downloadMessageImages(args.page, message.sourceId);
		const indexes: number[] = [];
		for (const image of images) {
			if (attachments.length >= 20) break;
			const digest = createHash("sha256").update(image.buffer).digest("hex");
			const existingIndex = attachments.findIndex(
				(attachment) => attachment.sha256 === digest,
			);
			if (existingIndex >= 0) {
				indexes.push(existingIndex);
				continue;
			}
			const uploaded = await uploadImage(args.utapi, message.sourceId, image);
			indexes.push(attachments.length);
			attachments.push(uploaded);
		}
		indexesBySourceId.set(message.sourceId, indexes);
	}

	const idempotencyKey = buildClusterIdempotencyKey(
		args.groupName,
		args.cluster.map((message) => message.sourceId),
	);
	const response = await fetch(
		new URL("/api/internal/whatsapp-browser-sync", args.baseUrl),
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${args.secret}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				idempotencyKey,
				organizationId: args.organizationId,
				groupName: args.groupName,
				sourceMessages: args.cluster.map((message) => ({
					sourceId: message.sourceId,
					senderName: message.senderName,
					senderPhone: message.senderPhone,
					sentAt: message.sentAt,
					text: message.text,
					attachmentIndexes: indexesBySourceId.get(message.sourceId) ?? [],
				})),
				attachments,
			}),
		},
	);
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`WorksRecorded ingestion failed (${response.status}): ${body.slice(0, 500)}`,
		);
	}
	return (await response.json()) as {
		status: "created" | "duplicate" | "needs_review";
		ambiguity: string | null;
	};
}

async function run() {
	for (const name of REQUIRED_ENV) requiredEnv(name);
	const paths = workerPaths();
	const lock = await acquireWorkerLock(paths.lockPath);
	const bootstrap = process.argv.includes("--bootstrap");
	const healthCheck = process.argv.includes("--health-check");
	const headless = bootstrap
		? false
		: booleanEnv("WHATSAPP_BROWSER_HEADLESS", true);
	const browser = await chromium.launchPersistentContext(
		paths.profileDirectory,
		{
			headless,
			executablePath:
				process.env.WHATSAPP_BROWSER_EXECUTABLE_PATH?.trim() || undefined,
			viewport: { width: 1_440, height: 1_000 },
		},
	);
	const page = browser.pages()[0] ?? (await browser.newPage());

	try {
		const groupName =
			process.env.WHATSAPP_BROWSER_GROUP_NAME?.trim() ||
			"Ikdiena paveiktais un izlietotais mat.";
		if (bootstrap) {
			await page.goto("https://web.whatsapp.com/", {
				waitUntil: "domcontentloaded",
			});
			process.stdout.write(
				"Scan the WhatsApp QR code, then stop this process with Ctrl+C.\n",
			);
			await new Promise<void>((resolve) =>
				process.once("SIGINT", () => resolve()),
			);
			return;
		}

		await openGroup(page, groupName);
		if (healthCheck) {
			process.stdout.write("WhatsApp browser health check passed.\n");
			return;
		}

		const messages = await loadedMessageMetadata(page);
		const state = await readBrowserSyncState(paths.statePath);
		const processed = new Set(state.processedSourceIds);
		const importAfterRaw = process.env.WHATSAPP_BROWSER_IMPORT_AFTER?.trim();
		const importAfter = importAfterRaw ? new Date(importAfterRaw) : null;

		if (state.processedSourceIds.length === 0 && !importAfter) {
			await writeBrowserSyncState(paths.statePath, {
				processedSourceIds: messages
					.map((message) => message.sourceId)
					.slice(-5_000),
				updatedAt: new Date().toISOString(),
			});
			process.stdout.write(
				"Initial checkpoint created. Set WHATSAPP_BROWSER_IMPORT_AFTER to import older loaded messages.\n",
			);
			return;
		}

		const pending = messages.filter(
			(message) =>
				!processed.has(message.sourceId) &&
				(!importAfter || new Date(message.sentAt) >= importAfter),
		);
		const clusters = clusterWhatsappMessages(
			pending,
			Number(process.env.WHATSAPP_BROWSER_CLUSTER_WINDOW_SECONDS || "180"),
		);
		const utapi = new UTApi();
		const reviewWarnings: string[] = [];
		for (const cluster of clusters) {
			const result = await postCluster({
				page,
				cluster,
				groupName,
				organizationId: requiredEnv("WHATSAPP_BROWSER_ORGANIZATION_ID"),
				baseUrl: requiredEnv("WORKSRECORDED_BASE_URL"),
				secret: requiredEnv("WHATSAPP_BROWSER_SYNC_SECRET"),
				utapi,
			});
			if (result.status === "needs_review" || result.ambiguity) {
				reviewWarnings.push(
					result.ambiguity ||
						`Message cluster ${cluster[0]?.sourceId ?? "unknown"} needs review`,
				);
			}
			for (const message of cluster) processed.add(message.sourceId);
			await writeBrowserSyncState(paths.statePath, {
				processedSourceIds: [...processed].slice(-5_000),
				updatedAt: new Date().toISOString(),
			});
		}
		process.stdout.write(
			`Processed ${clusters.length} new WhatsApp message cluster(s).\n`,
		);
		if (reviewWarnings.length > 0) {
			process.stderr.write(
				`Manual review required:\n${reviewWarnings.map((warning) => `- ${warning}`).join("\n")}\n`,
			);
			process.exitCode = 2;
		}
	} catch (error) {
		const screenshotPath = await saveFailureScreenshot(
			page,
			paths.failureDirectory,
		).catch(() => null);
		const suffix = screenshotPath
			? ` Failure screenshot: ${screenshotPath}`
			: "";
		throw new Error(
			`${error instanceof Error ? error.message : String(error)}${suffix}`,
		);
	} finally {
		await browser.close();
		await releaseWorkerLock(lock, paths.lockPath);
	}
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
