import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	INVOICE_SUPPLIER_PREFIX_MAP,
	inferSupplierNameFromInvoiceNumber,
} from "@/lib/bis/invoice-supplier-map";
import { prisma } from "@/lib/utils/db";
import { extractWarehouseInvoiceSupplierName } from "@/server/actions/META/RoutingHandlers/metaImageHandler";

type CandidateRow = {
	id: string;
	siteId: string | null;
	orgId: string | null;
	userId: string | null;
	invoiceNr: string | null;
	importBatchId: string | null;
	sourcePhoto: string | null;
};

type BackfillReportItem = {
	key: string;
	siteId: string;
	sourcePhoto: string;
	invoiceNumber: string | null;
	recordIds: string[];
	supplierName: string | null;
	source: "map" | "ai" | null;
	error?: string;
};

type BackfillReport = {
	createdAt: string;
	organizationId: string;
	siteId: string | null;
	items: BackfillReportItem[];
};

function readArg(name: string) {
	const prefix = `${name}=`;
	const inline = process.argv.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : null;
}

function readPositiveInteger(name: string, fallback: number) {
	const value = readArg(name);
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}

function readNonNegativeInteger(name: string, fallback: number) {
	const value = readArg(name);
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`${name} must be a non-negative integer`);
	}
	return parsed;
}

function usage() {
	return `Usage:
Inspect missing supplier invoice groups without model calls or writes:
  npm run backfill:warehouse-suppliers -- --organizationId <id> [--siteId <id>] [--limit 25] [--offset 0]

Discover missing or mismatched suppliers covered by the invoice-number map across organizations:
  npm run backfill:warehouse-suppliers -- --discover-mapped

Apply mapped suppliers to every matching material row within one organization:
  npm run backfill:warehouse-suppliers -- --organizationId <id> [--siteId <id>] --apply-mapped

Extract suppliers into a reviewable report. This calls the configured AI model but does not write the database:
  npm run backfill:warehouse-suppliers -- --organizationId <id> [--siteId <id>] [--limit 25] [--offset 0] --extract [--out <path>]

Apply a reviewed report. This fills only supplierName values that are still blank:
  npm run backfill:warehouse-suppliers -- --organizationId <id> --report <path> --apply

Options:
  --organizationId <id>  Required organization boundary.
  --siteId <id>          Optional project boundary.
  --discover-mapped      Read-only counts for missing or mismatched mapped suppliers.
  --apply-mapped         Set mapped suppliers on all matching material rows.
  --limit <count>        Maximum invoice groups. Defaults to 25.
  --offset <count>       Skip invoice groups, useful after unresolved reports.
  --extract              Explicitly allow model extraction and write a JSON report.
  --out <path>           Extraction report path. Defaults under .tmp.
  --report <path>        Reviewed report to apply.
  --apply                Apply results from the reviewed report.
  --help                 Print this message.`;
}

function groupCandidates(rows: CandidateRow[]) {
	const groups = new Map<
		string,
		{
			key: string;
			siteId: string;
			sourcePhoto: string;
			invoiceNumber: string | null;
			userId: string | null;
			recordIds: string[];
		}
	>();

	for (const row of rows) {
		if (!row.siteId || !row.sourcePhoto) continue;
		const key = row.importBatchId
			? `batch:${row.siteId}:${row.importBatchId}`
			: `photo:${row.siteId}:${row.sourcePhoto}`;
		const current = groups.get(key);
		if (current) {
			current.recordIds.push(row.id);
			if (!current.userId && row.userId) current.userId = row.userId;
			if (!current.invoiceNumber && row.invoiceNr)
				current.invoiceNumber = row.invoiceNr;
			continue;
		}
		groups.set(key, {
			key,
			siteId: row.siteId,
			sourcePhoto: row.sourcePhoto,
			invoiceNumber: row.invoiceNr,
			userId: row.userId,
			recordIds: [row.id],
		});
	}

	return Array.from(groups.values());
}

function inferContentType(url: string) {
	let pathname = url;
	try {
		pathname = new URL(url).pathname;
	} catch {}
	return pathname.toLowerCase().endsWith(".pdf")
		? "application/pdf"
		: undefined;
}

function defaultReportPath() {
	const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
	return path.join(".tmp", `warehouse-supplier-backfill-${timestamp}.json`);
}

async function loadCandidates(
	organizationId: string,
	siteId: string | null,
	limit: number,
	offset: number,
) {
	const rows = await prisma.bISmaterialRecords.findMany({
		where: {
			orgId: organizationId,
			...(siteId ? { siteId } : {}),
			sourcePhoto: { not: null },
			OR: [{ supplierName: null }, { supplierName: "" }],
		},
		select: {
			id: true,
			siteId: true,
			orgId: true,
			userId: true,
			invoiceNr: true,
			invoiceDate: true,
			importBatchId: true,
			sourcePhoto: true,
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
	return groupCandidates(rows).slice(offset, offset + limit);
}

async function inspectOrExtract(
	organizationId: string,
	siteId: string | null,
	limit: number,
	offset: number,
	extract: boolean,
	out: string | null,
) {
	const candidates = await loadCandidates(
		organizationId,
		siteId,
		limit,
		offset,
	);
	console.log(
		JSON.stringify(
			{
				mode: extract ? "extract" : "inspect",
				organizationId,
				siteId,
				invoiceGroups: candidates.length,
				records: candidates.reduce(
					(total, candidate) => total + candidate.recordIds.length,
					0,
				),
				groups: candidates.map((candidate) => ({
					key: candidate.key,
					invoiceNumber: candidate.invoiceNumber,
					records: candidate.recordIds.length,
					sourcePhoto: candidate.sourcePhoto,
				})),
			},
			null,
			2,
		),
	);
	if (!extract) return;

	const items: BackfillReportItem[] = [];
	for (const candidate of candidates) {
		try {
			const mappedSupplierName = inferSupplierNameFromInvoiceNumber(
				candidate.invoiceNumber,
			);
			const supplierName =
				mappedSupplierName ??
				(await extractWarehouseInvoiceSupplierName({
					publicUrl: candidate.sourcePhoto,
					contentType: inferContentType(candidate.sourcePhoto),
					siteId: candidate.siteId,
					organizationId,
					userId: candidate.userId,
				}));
			items.push({
				key: candidate.key,
				siteId: candidate.siteId,
				sourcePhoto: candidate.sourcePhoto,
				invoiceNumber: candidate.invoiceNumber,
				recordIds: candidate.recordIds,
				supplierName,
				source: mappedSupplierName ? "map" : "ai",
			});
		} catch (error) {
			items.push({
				key: candidate.key,
				siteId: candidate.siteId,
				sourcePhoto: candidate.sourcePhoto,
				invoiceNumber: candidate.invoiceNumber,
				recordIds: candidate.recordIds,
				supplierName: null,
				source: null,
				error: error instanceof Error ? error.message : "Extraction failed",
			});
		}
	}

	const report: BackfillReport = {
		createdAt: new Date().toISOString(),
		organizationId,
		siteId,
		items,
	};
	const reportPath = path.resolve(out ?? defaultReportPath());
	await mkdir(path.dirname(reportPath), { recursive: true });
	await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: "wx" });
	console.log(
		JSON.stringify({
			reportPath,
			extracted: items.filter((item) => item.supplierName).length,
			unresolved: items.filter((item) => !item.supplierName).length,
		}),
	);
}

async function applyReport(organizationId: string, reportPath: string) {
	const report = JSON.parse(
		await readFile(path.resolve(reportPath), "utf8"),
	) as BackfillReport;
	if (report.organizationId !== organizationId) {
		throw new Error("Report organization does not match --organizationId");
	}

	let updatedRecords = 0;
	let appliedGroups = 0;
	for (const item of report.items) {
		const supplierName = item.supplierName?.trim();
		if (!supplierName || !item.recordIds.length) continue;
		const result = await prisma.bISmaterialRecords.updateMany({
			where: {
				id: { in: item.recordIds },
				orgId: organizationId,
				siteId: item.siteId,
				sourcePhoto: item.sourcePhoto,
				OR: [{ supplierName: null }, { supplierName: "" }],
			},
			data: { supplierName },
		});
		if (result.count > 0) appliedGroups += 1;
		updatedRecords += result.count;
	}
	console.log(
		JSON.stringify({
			mode: "apply",
			organizationId,
			reportPath: path.resolve(reportPath),
			appliedGroups,
			updatedRecords,
		}),
	);
}

async function findMappedCandidates(
	organizationId: string | null,
	siteId: string | null,
) {
	const rows = await prisma.bISmaterialRecords.findMany({
		where: {
			...(organizationId ? { orgId: organizationId } : {}),
			...(siteId ? { siteId } : {}),
			invoiceNr: { not: null },
		},
		select: {
			id: true,
			orgId: true,
			siteId: true,
			invoiceNr: true,
			supplierName: true,
			invoiceDate: true,
			importBatchId: true,
			sourcePhoto: true,
			organization: { select: { name: true } },
			site: { select: { name: true } },
		},
		orderBy: [{ orgId: "asc" }, { siteId: "asc" }, { createdAt: "asc" }],
	});
	return rows.flatMap((row) => {
		const supplierName = inferSupplierNameFromInvoiceNumber(row.invoiceNr);
		return supplierName && row.supplierName !== supplierName
			? [{ ...row, supplierName }]
			: [];
	});
}

function mappedInvoiceGroupKey(candidate: {
	siteId: string | null;
	invoiceNr: string | null;
	invoiceDate: Date | null;
	importBatchId: string | null;
	sourcePhoto: string | null;
}) {
	if (candidate.importBatchId) {
		return `${candidate.siteId ?? "no-site"}:batch:${candidate.importBatchId}`;
	}
	if (candidate.sourcePhoto) {
		return `${candidate.siteId ?? "no-site"}:photo:${candidate.sourcePhoto}`;
	}
	return `${candidate.siteId ?? "no-site"}:number:${candidate.invoiceNr ?? ""}:${candidate.invoiceDate?.toISOString() ?? ""}`;
}

async function discoverMappedCandidates(
	organizationId: string | null,
	siteId: string | null,
) {
	const candidates = await findMappedCandidates(organizationId, siteId);
	const groups = new Map<
		string,
		{
			organizationId: string | null;
			organizationName: string | null;
			siteId: string | null;
			siteName: string | null;
			supplierName: string;
			recordCount: number;
			invoiceKeys: Set<string>;
		}
	>();
	for (const candidate of candidates) {
		const key = `${candidate.orgId ?? "no-org"}:${candidate.siteId ?? "no-site"}:${candidate.supplierName}`;
		const current = groups.get(key);
		if (current) {
			current.recordCount += 1;
			current.invoiceKeys.add(mappedInvoiceGroupKey(candidate));
		} else {
			groups.set(key, {
				organizationId: candidate.orgId,
				organizationName: candidate.organization?.name ?? null,
				siteId: candidate.siteId,
				siteName: candidate.site?.name ?? null,
				supplierName: candidate.supplierName,
				recordCount: 1,
				invoiceKeys: new Set([mappedInvoiceGroupKey(candidate)]),
			});
		}
	}
	console.log(
		JSON.stringify(
			{
				mode: "discover-mapped",
				organizationId,
				siteId,
				totalRecords: candidates.length,
				totalInvoices: new Set(candidates.map(mappedInvoiceGroupKey)).size,
				groups: Array.from(groups.values(), (group) => ({
					organizationId: group.organizationId,
					organizationName: group.organizationName,
					siteId: group.siteId,
					siteName: group.siteName,
					supplierName: group.supplierName,
					invoiceCount: group.invoiceKeys.size,
					recordCount: group.recordCount,
				})),
			},
			null,
			2,
		),
	);
}

async function applyMappedSuppliers(
	organizationId: string,
	siteId: string | null,
) {
	const suppliers = new Map<string, string[]>();
	for (const { prefix, supplierName } of INVOICE_SUPPLIER_PREFIX_MAP) {
		const prefixes = suppliers.get(supplierName) ?? [];
		prefixes.push(prefix);
		suppliers.set(supplierName, prefixes);
	}

	const results = [];
	for (const [supplierName, prefixes] of suppliers) {
		const invoiceFilter = prefixes.map((prefix) => ({
			invoiceNr: { startsWith: prefix, mode: "insensitive" as const },
		}));
		const scope = {
			orgId: organizationId,
			...(siteId ? { siteId } : {}),
			OR: invoiceFilter,
		};
		const rows = await prisma.bISmaterialRecords.findMany({
			where: scope,
			select: {
				siteId: true,
				invoiceNr: true,
				invoiceDate: true,
				importBatchId: true,
				sourcePhoto: true,
				supplierName: true,
			},
		});
		const rowsNeedingUpdate = rows.filter(
			(row) => row.supplierName !== supplierName,
		).length;
		const invoiceCount = new Set(rows.map(mappedInvoiceGroupKey)).size;
		const update = await prisma.bISmaterialRecords.updateMany({
			where: {
				...scope,
				OR: [{ supplierName: null }, { supplierName: { not: supplierName } }],
				AND: [{ OR: invoiceFilter }],
			},
			data: { supplierName },
		});
		results.push({
			supplierName,
			prefixes,
			invoiceCount,
			totalMatchingRows: rows.length,
			rowsNeedingUpdate,
			updatedRows: update.count,
		});
	}

	console.log(
		JSON.stringify(
			{
				mode: "apply-mapped",
				organizationId,
				siteId,
				results,
			},
			null,
			2,
		),
	);
}

async function main() {
	if (process.argv.includes("--help")) {
		console.log(usage());
		return;
	}
	if (process.argv.includes("--discover-mapped")) {
		await discoverMappedCandidates(
			readArg("--organizationId")?.trim() || null,
			readArg("--siteId")?.trim() || null,
		);
		return;
	}
	const organizationId = readArg("--organizationId")?.trim();
	if (!organizationId) throw new Error(usage());
	const siteId = readArg("--siteId")?.trim() || null;
	if (process.argv.includes("--apply-mapped")) {
		await applyMappedSuppliers(organizationId, siteId);
		return;
	}
	const apply = process.argv.includes("--apply");
	const extract = process.argv.includes("--extract");
	const report = readArg("--report");
	if (apply) {
		if (!report || extract) throw new Error(usage());
		await applyReport(organizationId, report);
		return;
	}
	if (report) throw new Error(usage());
	await inspectOrExtract(
		organizationId,
		siteId,
		readPositiveInteger("--limit", 25),
		readNonNegativeInteger("--offset", 0),
		extract,
		readArg("--out"),
	);
}

main()
	.catch((error: unknown) => {
		console.error(
			error instanceof Error
				? error.message
				: "Warehouse supplier backfill failed",
		);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
