import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/utils/db";
import {
	classifyMaterialDocumentImage,
	extractAndEnrichBISMaterialsFromPublicUrl,
	saveBISMaterialPayloadToDatabase,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";

type PhotoCandidate = {
	id: string;
	createdAt: Date;
	Date: Date | null;
	URL: string | null;
	fileUrl: string | null;
	Comment: string | null;
	mediaPurpose: string | null;
	siteId: string | null;
	organizationId: string | null;
	userId: string | null;
	User: {
		firstName: string | null;
		lastName: string | null;
		phone: string | null;
		organizationId: string | null;
		lastSelectedSiteIdforWhatsapp: string | null;
	} | null;
};

type MaterialContext = {
	userId: string;
	orgId: string | null;
	siteId: string | null;
	senderFirstName?: string | null;
	senderLastName?: string | null;
	senderName?: string | null;
	senderLabel?: string | null;
};

type BackfillReportItem = {
	photoId: string;
	url: string | null;
	sourceUrls: string[];
	createdAt: string;
	photoDate: string | null;
	comment: string | null;
	mediaPurpose: string | null;
	context: MaterialContext | null;
	status:
		| "dry_run_complete"
		| "skipped"
		| "commit_complete"
		| "commit_skipped"
		| "commit_failed";
	suggestedAction: "commit" | "review" | "skip" | "already_done";
	skipReason?: string;
	classification?: {
		isMaterialDocument: boolean;
		confidence: number;
		reason: string;
	};
	extractedItemCount: number;
	payload: { items: Array<Record<string, unknown>> } | null;
	committedAt?: string;
	commitError?: string;
};

type BackfillReport = {
	mode: "dry-run" | "commit";
	createdAt: string;
	photoIds: string[];
	items: BackfillReportItem[];
};

function readArg(name: string) {
	const prefix = `${name}=`;
	const inline = process.argv.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);

	const index = process.argv.indexOf(name);
	if (index >= 0) return process.argv[index + 1];

	return null;
}

function readFlag(name: string) {
	return process.argv.includes(name);
}

function parsePhotoIds(value: string | null) {
	return Array.from(
		new Set(
			(value ?? "")
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		),
	);
}

function usage() {
	return `Usage:
Dry-run real classifier + extractor, writes a report:
  tsx scripts/backfill-material-invoice-images.ts --photoIds id1,id2,id3

Commit selected photo IDs from a reviewed report:
  tsx scripts/backfill-material-invoice-images.ts --report .tmp/material-invoice-backfill-2026-08-12T120000000Z.json --commit --photoIds id1,id3

Commit every report item whose suggestedAction is commit:
  tsx scripts/backfill-material-invoice-images.ts --report .tmp/material-invoice-backfill-2026-08-12T120000000Z.json --commit --commitSuggested

Options:
  --out <path>            Dry-run report path. Defaults to .tmp/material-invoice-backfill-<timestamp>.json
  --photoIds <ids>        Comma-separated photo IDs. Required for dry-run. Optional filter for commit.
  --report <path>         Report JSON path for commit mode.
  --commit                Writes reviewed report payloads to BISmaterialRecords.
  --commitSuggested       In commit mode, commit report items with suggestedAction=commit.
  --help                  Print this message.`;
}

function getSenderName(user: PhotoCandidate["User"]) {
	return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
}

function buildContext(photo: PhotoCandidate): MaterialContext | null {
	const userId = photo.userId;
	if (!userId) return null;

	const senderName = getSenderName(photo.User);
	return {
		userId,
		orgId: photo.organizationId ?? photo.User?.organizationId ?? null,
		siteId: photo.siteId ?? photo.User?.lastSelectedSiteIdforWhatsapp ?? null,
		senderFirstName: photo.User?.firstName ?? null,
		senderLastName: photo.User?.lastName ?? null,
		senderName,
		senderLabel: senderName,
	};
}

function getPhotoUrl(photo: Pick<PhotoCandidate, "fileUrl" | "URL">) {
	return photo.fileUrl ?? photo.URL ?? null;
}

function getPhotoUrls(photo: Pick<PhotoCandidate, "fileUrl" | "URL">) {
	return Array.from(
		new Set([photo.fileUrl, photo.URL].filter(Boolean)),
	) as string[];
}

function getReportPath() {
	const explicit = readArg("--out");
	if (explicit) return explicit;

	const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
	return path.join(".tmp", `material-invoice-backfill-${timestamp}.json`);
}

async function loadPhotos(photoIds: string[]) {
	return prisma.photos.findMany({
		where: { id: { in: photoIds } },
		include: {
			User: {
				select: {
					firstName: true,
					lastName: true,
					phone: true,
					organizationId: true,
					lastSelectedSiteIdforWhatsapp: true,
				},
			},
		},
		orderBy: { createdAt: "asc" },
	}) as Promise<PhotoCandidate[]>;
}

async function hasExistingMaterialRows(urls: string[]) {
	if (urls.length === 0) return false;
	const count = await prisma.bISmaterialRecords.count({
		where: { sourcePhoto: { in: urls } },
	});
	return count > 0;
}

function classifySuggestedAction(args: {
	alreadyDone: boolean;
	classification: BackfillReportItem["classification"];
	extractedItemCount: number;
}) {
	if (args.alreadyDone) return "already_done" as const;
	if (args.extractedItemCount === 0) return "skip" as const;
	if (!args.classification) return "review" as const;
	if (
		args.classification.isMaterialDocument &&
		args.classification.confidence >= 0.65
	)
		return "commit" as const;
	return "review" as const;
}

async function dryRunPhoto(photo: PhotoCandidate): Promise<BackfillReportItem> {
	const url = getPhotoUrl(photo);
	const sourceUrls = getPhotoUrls(photo);
	const context = buildContext(photo);
	const base = {
		photoId: photo.id,
		url,
		sourceUrls,
		createdAt: photo.createdAt.toISOString(),
		photoDate: photo.Date?.toISOString() ?? null,
		comment: photo.Comment,
		mediaPurpose: photo.mediaPurpose,
		context,
	};

	if (!url) {
		return {
			...base,
			status: "skipped",
			suggestedAction: "skip",
			skipReason: "missing_url",
			extractedItemCount: 0,
			payload: null,
		};
	}

	if (!context?.userId || !context.siteId) {
		return {
			...base,
			status: "skipped",
			suggestedAction: "skip",
			skipReason: "missing_user_or_site_context",
			extractedItemCount: 0,
			payload: null,
		};
	}

	const alreadyDone = await hasExistingMaterialRows(sourceUrls);
	if (alreadyDone) {
		return {
			...base,
			status: "skipped",
			suggestedAction: "already_done",
			skipReason: "source_photo_already_has_material_rows",
			extractedItemCount: 0,
			payload: null,
		};
	}

	const classification = await classifyMaterialDocumentImage(url, context);
	const payload = await extractAndEnrichBISMaterialsFromPublicUrl({
		publicUrl: url,
		context,
	});
	const extractedItemCount = payload.items.length;

	return {
		...base,
		status: "dry_run_complete",
		suggestedAction: classifySuggestedAction({
			alreadyDone,
			classification,
			extractedItemCount,
		}),
		classification,
		extractedItemCount,
		payload,
	};
}

function writeReport(report: BackfillReport, reportPath: string) {
	const directory = path.dirname(reportPath);
	if (directory && directory !== ".") mkdirSync(directory, { recursive: true });
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function readReport(reportPath: string): BackfillReport {
	return JSON.parse(readFileSync(reportPath, "utf8")) as BackfillReport;
}

async function runDryRun(photoIds: string[]) {
	const photos = await loadPhotos(photoIds);
	const foundIds = new Set(photos.map((photo) => photo.id));
	const missingIds = photoIds.filter((id) => !foundIds.has(id));

	const items: BackfillReportItem[] = [];
	for (const photo of photos) {
		console.log(`Dry-run ${photo.id}`);
		items.push(await dryRunPhoto(photo));
	}

	for (const photoId of missingIds) {
		items.push({
			photoId,
			url: null,
			sourceUrls: [],
			createdAt: new Date().toISOString(),
			photoDate: null,
			comment: null,
			mediaPurpose: null,
			context: null,
			status: "skipped",
			suggestedAction: "skip",
			skipReason: "photo_not_found",
			extractedItemCount: 0,
			payload: null,
		});
	}

	const report: BackfillReport = {
		mode: "dry-run",
		createdAt: new Date().toISOString(),
		photoIds,
		items,
	};
	const reportPath = getReportPath();
	writeReport(report, reportPath);
	console.log(
		JSON.stringify({ reportPath, summary: summarize(report.items) }, null, 2),
	);
}

function summarize(items: BackfillReportItem[]) {
	return items.reduce<Record<string, number>>((acc, item) => {
		acc[item.suggestedAction] = (acc[item.suggestedAction] ?? 0) + 1;
		return acc;
	}, {});
}

async function commitItem(
	item: BackfillReportItem,
): Promise<BackfillReportItem> {
	if (
		!item.url ||
		!item.context ||
		!item.payload ||
		item.payload.items.length === 0
	) {
		return {
			...item,
			status: "commit_skipped",
			skipReason: item.skipReason ?? "missing_url_context_or_payload",
		};
	}

	if (!item.context.siteId) {
		return {
			...item,
			status: "commit_skipped",
			skipReason: "missing_site_context",
		};
	}

	if (await hasExistingMaterialRows([item.url, ...item.sourceUrls])) {
		return {
			...item,
			status: "commit_skipped",
			suggestedAction: "already_done",
			skipReason: "source_photo_already_has_material_rows",
		};
	}

	try {
		await saveBISMaterialPayloadToDatabase(
			item.payload,
			item.url,
			item.context,
		);
		return {
			...item,
			status: "commit_complete",
			committedAt: new Date().toISOString(),
		};
	} catch (error) {
		return {
			...item,
			status: "commit_failed",
			commitError: error instanceof Error ? error.message : String(error),
		};
	}
}

async function runCommit(
	reportPath: string,
	photoIds: string[],
	commitSuggested: boolean,
) {
	const report = readReport(reportPath);
	const selectedIds = new Set(photoIds);
	const itemsToCommit = report.items.filter((item) => {
		if (selectedIds.size > 0) return selectedIds.has(item.photoId);
		return commitSuggested && item.suggestedAction === "commit";
	});

	if (itemsToCommit.length === 0) {
		throw new Error(
			"No report items selected for commit. Pass --photoIds or --commitSuggested.",
		);
	}

	const committedItems: BackfillReportItem[] = [];
	for (const item of itemsToCommit) {
		console.log(`Commit ${item.photoId}`);
		committedItems.push(await commitItem(item));
	}

	const commitReport: BackfillReport = {
		mode: "commit",
		createdAt: new Date().toISOString(),
		photoIds: committedItems.map((item) => item.photoId),
		items: committedItems,
	};
	const outputPath = getReportPath();
	writeReport(commitReport, outputPath);
	console.log(
		JSON.stringify(
			{ reportPath: outputPath, summary: summarize(committedItems) },
			null,
			2,
		),
	);
}

async function main() {
	if (readFlag("--help")) {
		console.log(usage());
		return;
	}

	const commit = readFlag("--commit");
	const reportPath = readArg("--report");
	const photoIds = parsePhotoIds(readArg("--photoIds"));

	if (commit) {
		if (!reportPath) throw new Error(`Missing --report.\n${usage()}`);
		await runCommit(reportPath, photoIds, readFlag("--commitSuggested"));
		return;
	}

	if (photoIds.length === 0) {
		throw new Error(`Missing --photoIds.\n${usage()}`);
	}

	await runDryRun(photoIds);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
