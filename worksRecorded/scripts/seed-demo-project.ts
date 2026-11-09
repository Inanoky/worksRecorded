import "dotenv/config";
import { File } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { type Prisma, PrismaClient } from "@prisma/client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { UTApi } from "uploadthing/server";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import type {
	Forma2Allocation,
	Forma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";
import { planMatchKey } from "@/flows/default-construction/planner/model";
import { visualStateSchema } from "@/flows/default-construction/visual/model";
import { visualPlanAreasSchema } from "@/flows/default-construction/visual/planning-model";
import { DEMO_ORGANIZATION_ID, DEMO_SITE_ID } from "@/flows/demo/constants";
import {
	createDemoData,
	DEMO_PROJECT_NAME,
	demoFloors,
	demoWorks,
} from "@/flows/demo/data";
import { BEGIN_STORAGE_MARKER, beginDaySchema } from "@/lib/begin-hours";

const prisma = new PrismaClient();
const json = (value: unknown) =>
	JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const id = (key: string) => {
	const hex = createHash("sha256")
		.update(`${DEMO_SITE_ID}:${key}`)
		.digest("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const date = (value: string) => new Date(`${value}T12:00:00Z`);

async function invoice() {
	const document = await PDFDocument.create();
	const page = document.addPage([595, 842]);
	const font = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const text = (
		value: string,
		x: number,
		y: number,
		size = 12,
		heading = false,
	) =>
		page.drawText(value, {
			x,
			y: 842 - y,
			size,
			font: heading ? bold : font,
			color: rgb(0.1, 0.15, 0.2),
		});
	text("MATERIALU PIEGADES REKINS", 45, 70, 23, true);
	text("OM-2026-114", 45, 103, 14);
	text("Piegadatajs: Ozolu materiali", 45, 160);
	text("Sanemejs: Ozolu projekti", 45, 185);
	text("Objekts: Ozolu biroju centrs", 45, 210);
	text("Datums: 02.11.2026.", 45, 235);
	const rows = [
		["Smilts", "12 m3", "240.00"],
		["XPS 100 mm", "120 m2", "1080.00"],
		["PE hidroizolacijas pleve", "120 m2", "144.00"],
		["Betons C25/30", "8 m3", "720.00"],
	];
	text("Nosaukums", 45, 300, 12, true);
	text("Daudzums", 330, 300, 12, true);
	text("Summa, EUR", 440, 300, 12, true);
	rows.forEach((row, index) => {
		const y = 345 + index * 45;
		text(row[0], 45, y);
		text(row[1], 330, y);
		text(row[2], 450, y);
	});
	text("Kopa bez PVN", 300, 590, 14, true);
	text("2184.00 EUR", 440, 590, 14, true);
	text("PVN 21%", 300, 625);
	text("458.64 EUR", 440, 625);
	text("Apmaksai", 300, 670, 16, true);
	text("2642.64 EUR", 430, 670, 16, true);
	return document.save();
}

async function main() {
	const ownerId = process.argv[2];
	if (!ownerId)
		throw new Error("Provide the project owner's existing user id.");
	const owner = await prisma.user.findUniqueOrThrow({
		where: { id: ownerId },
		select: { id: true },
	});
	const existing = await prisma.site.findUnique({
		where: { id: DEMO_SITE_ID },
	});
	if (existing) {
		if (
			existing.organizationId !== DEMO_ORGANIZATION_ID ||
			existing.userId !== owner.id
		)
			throw new Error("Existing project identity differs.");
		console.log(
			JSON.stringify({
				siteId: existing.id,
				name: existing.name,
				preserved: true,
			}),
		);
		return;
	}
	const apply = process.argv.includes("--apply");
	if (!apply) {
		console.log(
			JSON.stringify({
				siteId: DEMO_SITE_ID,
				organizationId: DEMO_ORGANIZATION_ID,
				ownerId,
				records: 12,
				floors: 2,
				materialPositions: 4,
				workers: 4,
				mode: "preview",
			}),
		);
		return;
	}
	await mkdir(".tmp", { recursive: true });
	const manifestPath = ".tmp/demo-uploaded-assets.json";
	let urls: Record<string, string> = {};
	try {
		urls = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch {}
	const uploader = new UTApi();
	const upload = async (
		key: string,
		data: Uint8Array,
		name: string,
		type: string,
	) => {
		if (urls[key]) return urls[key];
		const result = await uploader.uploadFiles(
			new File([new Uint8Array(data)], name, { type }),
		);
		if (result.error || !result.data)
			throw new Error(`Asset upload failed: ${key}`);
		urls[key] = result.data.ufsUrl;
		await writeFile(manifestPath, JSON.stringify(urls, null, 2));
		return urls[key];
	};
	for (let floor = 1; floor <= 2; floor++) {
		await upload(
			`floor-${floor}`,
			await readFile(`public/demo/floor-${floor}.pdf`),
			`Ozolu-centrs-AR-0${floor}.pdf`,
			"application/pdf",
		);
		for (let source = 1; source <= 6; source++) {
			const image = await sharp(
				await readFile(`public/demo/source-${floor}-${source}.svg`),
			)
				.webp({ quality: 90 })
				.toBuffer();
			await upload(
				`source-${floor}-${source}`,
				image,
				`Darbu-atskaite-${floor}-${source}.webp`,
				"image/webp",
			);
		}
	}
	await upload(
		"invoice",
		await invoice(),
		"OM-2026-114.pdf",
		"application/pdf",
	);
	const fixture = createDemoData();
	const documentId = id("estimate");
	const salaryReportId = id("salary-report");
	const salaryHash = createHash("sha256").update(DEMO_SITE_ID).digest("hex");
	const positions: Forma2Position[] = demoWorks.map((work, index) => ({
		id: id(`position-${index}`),
		code: `1.${index + 1}`,
		categoryCode: "1",
		categoryName: "Grīdu izbūve",
		name: work,
		kind: "work",
		parentId: null,
		sourceRow: index + 2,
		unit: "m2",
		plannedQuantity: 240,
		laborNormHoursPerUnit: [0.22, 0.18, 0.1, 0.35][index],
		hourlyRate: 12.5,
		plannedWorkCost: [660, 540, 300, 1050][index],
		plannedMaterialCost: [240, 1080, 144, 720][index],
		plannedMechanismCost: [120, 0, 0, 180][index],
		plannedTotalCost: [1020, 1620, 444, 1950][index],
	}));
	const allocations: Forma2Allocation[] = fixture.records.map(
		(record, index) => ({
			sourceType: "work",
			sourceId: id(record.id),
			positionId: positions[(index % 6) % 4].id,
			method: "manual",
			confidence: 1,
			assignedAt: "2026-11-07T16:00:00.000Z",
		}),
	);
	positions.forEach((position, index) => {
		allocations.push({
			sourceType: "material",
			sourceId: id(`material-${index}`),
			positionId: position.id,
			method: "manual",
			confidence: 1,
			assignedAt: "2026-11-07T16:00:00.000Z",
		});
	});
	const config = structuredClone(defaultConfig) as Record<
		string,
		Record<string, unknown>
	>;
	config.Location.DropDownOptions = Object.fromEntries(
		demoFloors.map((floor) => [floor, floor]),
	);
	config.Works.DropDownOptions = Object.fromEntries(
		demoWorks.map((work) => [work, work]),
	);
	config.Units.DropDownOptions = { m2: "m2", m3: "m3", gab: "gab", h: "h" };
	config.otherSettings = {
		...config.otherSettings,
		fimaCollaboration: true,
		limeniVisualSections: ["A korpuss", "B korpuss"],
		defaultConstructionProductivity: {
			version: 4,
			works: positions.map((position) => ({
				work: position.name,
				unit: position.unit,
				laborNormHoursPerUnit: position.laborNormHoursPerUnit,
				hourlyCost: 12.5,
				costCalculationMode: "hourly",
			})),
		},
		defaultConstructionForma2WorkSync: {
			version: 1,
			documentId,
			entries: positions.map((position) => ({
				positionId: position.id,
				work: position.name,
				ownedByForma2: true,
			})),
		},
		beginSalaryAllocation: {
			costSource: "begin-report",
			sourceReportId: salaryReportId,
			planSha256: salaryHash,
		},
	};
	const workerNames = [
		["Jānis", "Ozols"],
		["Artūrs", "Liepa"],
		["Māris", "Kalns"],
		["Andrejs", "Bērziņš"],
	];
	const now = new Date("2026-11-07T17:00:00Z");
	await prisma.$transaction(
		async (tx) => {
			if (await tx.site.findUnique({ where: { id: DEMO_SITE_ID } }))
				throw new Error(
					"Project was created concurrently. Retry to read its existing identity.",
				);
			await tx.organization.create({
				data: {
					id: DEMO_ORGANIZATION_ID,
					name: "Ozolu projekti",
					orgLanguage: "lv",
				},
			});
			await tx.flowAssignment.create({
				data: {
					organizationId: DEMO_ORGANIZATION_ID,
					flowModuleKey: "demo",
					enabled: true,
				},
			});
			await tx.site.create({
				data: {
					id: DEMO_SITE_ID,
					name: DEMO_PROJECT_NAME,
					description: "Divu stāvu biroju ēkas izbūve",
					subdirectory: "ozolu-biroju-centrs",
					userId: owner.id,
					organizationId: DEMO_ORGANIZATION_ID,
					siteDiaryRecordsMap: json(config),
				},
			});
			for (let worker = 0; worker < workerNames.length; worker++)
				await tx.workers.create({
					data: {
						id: id(`worker-${worker}`),
						name: workerNames[worker][0],
						surname: workerNames[worker][1],
						role: "worker",
						siteId: DEMO_SITE_ID,
						organizationId: DEMO_ORGANIZATION_ID,
						phone: null,
					},
				});
			const saved = [];
			for (const [index, record] of fixture.records.entries()) {
				const floor = Math.floor(index / 6) + 1;
				const image = urls[`source-${floor}-${(index % 6) + 1}`];
				const totalMinutes = (record.proposal.workers ?? 1) * 240;
				const metadata = {
					fimaCollaboration: {
						version: 0,
						status: ["updated", "ai_prepared", "needs_changes"][index % 3],
						materials: record.proposal.materials.map((material) => ({
							id: material.id,
							label: material.name,
							quantity: material.quantity,
							unit: material.unit,
						})),
						history: [],
					},
					beginSalaryAllocation: {
						kind: "begin-salary-allocation:v1",
						currency: "EUR",
						sourceReportId: salaryReportId,
						planSha256: salaryHash,
						totalMinutes,
						totalCents: Math.round((totalMinutes / 60) * 1250),
						lines: workerNames
							.slice(0, record.proposal.workers ?? 1)
							.map(([name, surname]) => ({
								worker: `${name} ${surname}`,
								minutes: 240,
								rateCents: 1250,
								totalCents: 5000,
							})),
					},
				};
				const row = await tx.sitediaryrecords.create({
					data: {
						id: id(record.id),
						siteId: DEMO_SITE_ID,
						organizationId: DEMO_ORGANIZATION_ID,
						userId: owner.id,
						workerId: id(`worker-${index % 4}`),
						Date: date(record.proposal.date),
						Location: demoFloors[floor - 1],
						Works: record.proposal.sourceWork,
						Works_Custom_1: record.proposal.description,
						Works_Custom_2: "08:00–16:30",
						Units: "m2",
						Amounts: record.proposal.quantity,
						WorkersInvolved: record.proposal.workers,
						TimeInvolved: 4,
						Comments: record.proposal.notes,
						originalUserComment: record.sources[0].raw,
						Photos: [image],
						evalMetadata: json(metadata),
					},
				});
				saved.push(row);
				await tx.photos.create({
					data: {
						id: id(`photo-${record.id}`),
						diaryRecordId: row.id,
						siteId: DEMO_SITE_ID,
						organizationId: DEMO_ORGANIZATION_ID,
						userId: owner.id,
						Date: row.Date,
						URL: image,
						fileUrl: image,
						Location: row.Location,
						Comment: row.Comments,
						mediaPurpose: "site_diary",
					},
				});
			}
			for (let floor = 1; floor <= 2; floor++) {
				const location = demoFloors[floor - 1];
				const records = saved.filter((row) => row.Location === location);
				const evidence = records.map((row) => {
					const revisionData = Object.fromEntries(
						Object.entries({
							...row,
							Location: location.toLocaleLowerCase("lv"),
						})
							.filter(([key]) => key !== "Photos")
							.sort(([a], [b]) => a.localeCompare(b)),
					);
					return {
						id: `${row.id}:0`,
						recordId: row.id,
						photoUrl: row.Photos[0],
						work: row.Works ?? "",
						location,
						description: row.Comments ?? "",
						date: row.Date?.toISOString() ?? null,
						amount: row.Amounts,
						unit: row.Units ?? "",
						sourceRevision: createHash("sha256")
							.update(JSON.stringify(revisionData))
							.digest("hex"),
					};
				});
				const marks = fixture.marks[location].map((mark, index) => ({
					...mark,
					id: id(mark.id),
					evidenceId: evidence[index].id,
					explanation: "Darba zona atbilstoši avota rasējumam.",
				}));
				const state = visualStateSchema.parse({
					version: 1,
					location,
					status: "complete",
					pageCount: 1,
					processed: 6,
					evidence,
					marks,
					unlocated: [],
					error: null,
					lockedAt: null,
					attempts: [],
				});
				await tx.documents.create({
					data: {
						id: id(`drawing-${floor}`),
						siteId: DEMO_SITE_ID,
						organizationId: DEMO_ORGANIZATION_ID,
						userId: owner.id,
						url: urls[`floor-${floor}`],
						documentType: "limeni-visual-v1",
						documentName: `AR-0${floor} · ${location} grīdu plāns.pdf`,
						description: JSON.stringify(state),
					},
				});
				for (let work = 0; work < 2; work++) {
					const geometry = visualPlanAreasSchema.parse({
						version: 1,
						section: work === 0 ? "A korpuss" : "B korpuss",
						areas: [
							{
								id: id(`plan-area-${floor}-${work}`),
								page: 1,
								polygon: marks[work === 0 ? 2 : 5].polygon,
							},
						],
					});
					await tx.constructionPlan.create({
						data: {
							id: id(`plan-${floor}-${work}`),
							siteId: DEMO_SITE_ID,
							planType: "visual_milestone",
							startDate: date("2026-11-06"),
							date: date("2026-11-12"),
							work: demoWorks[work + 1],
							location,
							unit: "m2",
							quantity: work === 0 ? 76 : 88,
							matchKey: planMatchKey(demoWorks[work + 1], location, "m2"),
							visualDrawingId: id(`drawing-${floor}`),
							visualAreas: json(geometry),
							createdBy: owner.id,
							updatedBy: owner.id,
						},
					});
				}
			}
			for (let day = 2; day <= 7; day++) {
				const dayString = `2026-11-0${day}`;
				const entries = workerNames.map(([name, surname]) => ({
					worker: `${name} ${surname}`,
					date: dayString,
					start: "08:00",
					end: "16:30",
					minutes: 480,
					object: DEMO_PROJECT_NAME,
					status: "approved",
					comment: demoWorks[(day - 2) % 4],
				}));
				const hours = beginDaySchema.parse({
					kind: BEGIN_STORAGE_MARKER,
					version: 1,
					date: dayString,
					importedAt: now.toISOString(),
					importedBy: owner.id,
					sourceCompany: "Ozolu projekti",
					capturedOn: "2026-11-07",
					rateCents: 1250,
					objects: [DEMO_PROJECT_NAME],
					entries,
					allocations: saved
						.filter((row) => row.Date?.toISOString().startsWith(dayString))
						.map((row) => ({
							recordId: row.id,
							explanation:
								"Darba laiks sadalīts pēc brigādes dienas atskaites.",
							hours: row.TimeInvolved,
							workers: row.WorkersInvolved,
							savedAt: now.toISOString(),
							sourceImportedAt: now.toISOString(),
							source: "begin-allocation",
						})),
					history: [],
				});
				await tx.sitediaryrecords.create({
					data: {
						id: id(`hours-${day}`),
						siteId: DEMO_SITE_ID,
						organizationId: DEMO_ORGANIZATION_ID,
						userId: owner.id,
						Date: date(dayString),
						Works: "Stundu dati",
						Comments_Custom_2: JSON.stringify(hours),
						Photos: [],
						archivedAt: now,
						archiveReason: BEGIN_STORAGE_MARKER,
					},
				});
				for (let worker = 0; worker < 4; worker++)
					await tx.timelog.create({
						data: {
							id: id(`timelog-${day}-${worker}`),
							workerId: id(`worker-${worker}`),
							siteId: DEMO_SITE_ID,
							organizationId: DEMO_ORGANIZATION_ID,
							date: date(dayString),
							clockIn: new Date(`${dayString}T06:00:00Z`),
							clockOut: new Date(`${dayString}T14:00:00Z`),
							wocation: demoFloors[worker % 2],
							works: demoWorks[(day - 2) % 4],
						},
					});
			}
			for (let material = 0; material < 4; material++)
				await tx.bISmaterialRecords.create({
					data: {
						id: id(`material-${material}`),
						siteId: DEMO_SITE_ID,
						orgId: DEMO_ORGANIZATION_ID,
						userId: owner.id,
						name: [
							"Smilts",
							"XPS 100 mm",
							"PE hidroizolācijas plēve",
							"Betons C25/30",
						][material],
						quantity: [12, 120, 120, 8][material],
						measurementUnit: ["m3", "m2", "m2", "m3"][material],
						cost: [240, 1080, 144, 720][material],
						invoiceNr: "OM-2026-114",
						supplierName: "Ozolu materiāli",
						invoiceDate: date("2026-11-02"),
						materialDate: date("2026-11-02"),
						sourcePhoto: urls.invoice,
					},
				});
			await tx.analytics.create({
				data: {
					siteId: DEMO_SITE_ID,
					currentWeekProgress: json({
						defaultConstructionForma2: {
							version: 1,
							document: {
								id: documentId,
								fileName: "Ozolu centra tāme.xlsx",
								sheetName: "Grīdu izbūve",
								importedAt: now.toISOString(),
								positions,
							},
							allocations,
							materialRules: [],
						},
					}),
				},
			});
		},
		{ timeout: 60000 },
	);
	console.log(
		JSON.stringify({
			siteId: DEMO_SITE_ID,
			organizationId: DEMO_ORGANIZATION_ID,
			records: await prisma.sitediaryrecords.count({
				where: { siteId: DEMO_SITE_ID, archivedAt: null },
			}),
			drawings: await prisma.documents.count({
				where: { siteId: DEMO_SITE_ID, documentType: "limeni-visual-v1" },
			}),
			plans: await prisma.constructionPlan.count({
				where: { siteId: DEMO_SITE_ID },
			}),
			timelogs: await prisma.timelog.count({ where: { siteId: DEMO_SITE_ID } }),
		}),
	);
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : "Seed failed");
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
