import { addDays } from "./model";
import {
	escapeReportText as htmlText,
	type ReportDay,
	type ReportRow,
	reportColumns,
	type WeeklyReport,
	weeklyReportDays,
} from "./weekly-report";
import {
	formatWeeklyReportDate,
	getWeeklyReportMessages,
} from "./weekly-report-i18n";

const width = 1587;
const height = 1123;
const padding = 32;
const contentWidth = width - padding * 2;
const totalWeight = reportColumns.reduce(
	(sum, column) => sum + column.width,
	0,
);
const cellWidths = reportColumns.map(
	(column) => (contentWidth * column.width) / totalWeight,
);
const bodyBottom = height - 64;
const dayHeaderHeight = 72;
const tableHeaderHeight = 52;
type Cell = { lines: string[]; notes: string[] };

function wrap(
	text: string,
	maxWidth: number,
	context: CanvasRenderingContext2D,
): string[] {
	return text.split("\n").flatMap((paragraph) => {
		const lines: string[] = [];
		let line = "";
		for (const word of paragraph.split(/\s+/)) {
			const next = line ? `${line} ${word}` : word;
			if (context.measureText(next).width <= maxWidth) {
				line = next;
				continue;
			}
			if (line) lines.push(line);
			line = "";
			for (const char of word) {
				if (line && context.measureText(line + char).width > maxWidth) {
					lines.push(line);
					line = "";
				}
				line += char;
			}
		}
		lines.push(line);
		return lines;
	});
}

function rowCells(
	row: ReportRow,
	context: CanvasRenderingContext2D,
	family: string,
): Cell[] {
	return row.cells.map((text, index) => {
		context.font = `400 12px ${family}`;
		const lines = wrap(text, cellWidths[index] - 14, context);
		context.font = `400 10px ${family}`;
		return {
			lines,
			notes:
				index === 5 && row.note
					? wrap(row.note, cellWidths[index] - 14, context)
					: [],
		};
	});
}
function rowHeight(cells: Cell[]) {
	return (
		25 +
		Math.max(
			...cells.map(
				(cell) =>
					cell.lines.length * 16 +
					(cell.notes.length ? cell.notes.length * 14 + 4 : 0),
			),
		)
	);
}
function rowHtml(cells: Cell[], status: ReportRow["status"], rowSize: number) {
	const background =
		status === "over" ? "#f0fdf4" : status === "under" ? "#fef2f2" : "#fff";
	return `<div style="display:flex;height:${rowSize}px;box-sizing:border-box;background:${background};border-bottom:1px solid #e4e4e7">${cells.map((cell, index) => `<div style="width:${cellWidths[index]}px;padding:12px 6px;text-align:${reportColumns[index].align};font-size:12px;line-height:16px;box-sizing:border-box;flex-shrink:0">${cell.lines.map(htmlText).join("<br/>")}${cell.notes.length ? `<div style="margin-top:4px;font-size:10px;line-height:14px;color:#64748b">${cell.notes.map(htmlText).join("<br/>")}</div>` : ""}</div>`).join("")}</div>`;
}

export function weeklyReportPages(
	report: WeeklyReport,
	context: CanvasRenderingContext2D,
	family: string,
): string[] {
	const t = getWeeklyReportMessages(report.organizationLanguage);
	const dateRange = `${formatWeeklyReportDate(report.start, report.organizationLanguage)} – ${formatWeeklyReportDate(addDays(report.start, 6), report.organizationLanguage)}`;
	const pages: string[] = [];
	context.font = `400 16px ${family}`;
	const siteLines = wrap(report.siteName || t.site, contentWidth, context);
	const headerHeight = 96 + siteLines.length * 24;
	if (headerHeight > 400) throw new Error(t.longTitle);
	const header = `<div style="height:${headerHeight}px;box-sizing:border-box;padding-bottom:20px"><div style="font-size:24px;font-weight:600;line-height:32px">${htmlText(t.title)}</div><div style="font-size:16px;line-height:24px;margin-top:4px">${siteLines.map(htmlText).join("<br/>")}</div><div style="font-size:14px;line-height:20px;color:#64748b">${htmlText(dateRange)} · ${htmlText(t.subtitle)}</div><div style="font-size:10px;line-height:16px;color:#64748b;margin-top:4px">${htmlText(t.legend)}</div></div>`;
	let body = header;
	let y = padding + headerHeight;
	let activeDay: ReportDay | null = null;
	function finish() {
		pages.push(body);
		body = header;
		y = padding + headerHeight;
	}
	function dayHeading(day: ReportDay, continued = false) {
		body += `<div style="height:${dayHeaderHeight}px;padding-top:16px;box-sizing:border-box"><div style="font-size:18px;font-weight:600;line-height:28px">${htmlText(day.title)}${continued ? ` · ${htmlText(t.continued)}` : ""}</div><div style="font-size:12px;line-height:16px;color:#64748b">${htmlText(day.summary)}</div></div><div style="display:flex;height:${tableHeaderHeight}px;box-sizing:border-box;border-bottom:1px solid #e4e4e7;align-items:center">${reportColumns.map((column, index) => `<div style="width:${cellWidths[index]}px;flex-shrink:0;box-sizing:border-box;padding:0 6px;font-size:12px;line-height:16px;font-weight:500;text-align:${column.align}">${htmlText(t.columns[index])}</div>`).join("")}</div>`;
		y += dayHeaderHeight + tableHeaderHeight;
		activeDay = day;
	}
	for (const day of weeklyReportDays(report)) {
		if (y + dayHeaderHeight + tableHeaderHeight + 57 > bodyBottom) finish();
		dayHeading(day);
		if (!day.rows.length) {
			body += `<div style="height:41px;padding:12px 6px;box-sizing:border-box;font-size:12px;line-height:16px;color:#64748b;border-bottom:1px solid #e4e4e7">${htmlText(t.empty)}</div>`;
			y += 41;
		}
		for (const row of day.rows) {
			let cells = rowCells(row, context, family);
			const maxRowHeight =
				bodyBottom -
				padding -
				headerHeight -
				dayHeaderHeight -
				tableHeaderHeight;
			if (y + Math.min(rowHeight(cells), maxRowHeight) > bodyBottom) {
				finish();
				dayHeading(day, true);
			}
			while (cells.some((cell) => cell.lines.length || cell.notes.length)) {
				const available = bodyBottom - y;
				if (rowHeight(cells) <= available) {
					const size = rowHeight(cells);
					body += rowHtml(cells, row.status, size);
					y += size;
					break;
				}
				const fragment = cells.map((cell) => {
					const lines = cell.lines.slice(0, Math.floor((available - 25) / 16));
					const noteSpace = available - 29 - lines.length * 16;
					const notes =
						lines.length === cell.lines.length
							? cell.notes.slice(0, Math.max(0, Math.floor(noteSpace / 14)))
							: [];
					return { lines, notes };
				});
				body += rowHtml(fragment, row.status, rowHeight(fragment));
				cells = cells.map((cell, index) => ({
					lines: cell.lines.slice(fragment[index].lines.length),
					notes: cell.notes.slice(fragment[index].notes.length),
				}));
				finish();
				dayHeading(day, true);
			}
		}
	}
	if (activeDay) finish();
	return pages.map(
		(content, index) =>
			`<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;box-sizing:border-box;padding:${padding}px;background:white;color:#09090b;font-family:${htmlText(family)};position:relative">${content}<div style="position:absolute;bottom:16px;left:${padding}px;right:${padding}px;border-top:1px solid #e4e4e7;padding-top:8px;font-size:10px;line-height:14px;color:#64748b;display:flex;align-items:center;justify-content:space-between;height:32px"><span>${htmlText(dateRange)}</span><span style="position:absolute;left:50%;transform:translateX(-50%)">${index + 1} / ${pages.length}</span><span style="font-size:12px;line-height:16px;color:#008a3d">WorksRecorded.com</span></div></div>`,
	);
}

async function pageImage(
	html: string,
	errorMessage: string,
): Promise<Uint8Array> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
	const image = new Image();
	image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = width * 3;
	canvas.height = height * 3;
	const context = canvas.getContext("2d");
	if (!context) throw new Error(errorMessage);
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	const blob = await new Promise<Blob>((resolve, reject) =>
		canvas.toBlob(
			(value) => (value ? resolve(value) : reject(new Error(errorMessage))),
			"image/png",
		),
	);
	canvas.width = 0;
	canvas.height = 0;
	return new Uint8Array(await blob.arrayBuffer());
}

export async function createWeeklyPdf(
	report: WeeklyReport,
): Promise<Uint8Array> {
	const t = getWeeklyReportMessages(report.organizationLanguage);
	await document.fonts.ready;
	const family = getComputedStyle(document.body).fontFamily;
	const context = document.createElement("canvas").getContext("2d");
	if (!context) throw new Error(t.unsupported);
	const { PDFDocument } = await import("pdf-lib");
	const pdf = await PDFDocument.create();
	const logoResponse = await fetch("/logos/worksrecorded-letter.png");
	if (!logoResponse.ok) throw new Error(t.error);
	const logo = await pdf.embedPng(await logoResponse.arrayBuffer());
	const logoHeight = 32;
	const logoWidth = (logo.width / logo.height) * logoHeight;
	context.font = `400 12px ${family}`;
	const brandWidth = context.measureText("WorksRecorded.com").width;
	pdf.setTitle(
		`${t.title} · ${report.siteName} · ${formatWeeklyReportDate(report.start, report.organizationLanguage)} – ${formatWeeklyReportDate(addDays(report.start, 6), report.organizationLanguage)}`,
	);
	pdf.setCreator("WorksRecorded");
	for (const html of weeklyReportPages(report, context, family)) {
		const image = await pdf.embedPng(await pageImage(html, t.error));
		const page = pdf.addPage([width * 0.75, height * 0.75]);
		page.drawImage(image, {
			x: 0,
			y: 0,
			width: page.getWidth(),
			height: page.getHeight(),
		});
		page.drawImage(logo, {
			x: (width - padding - brandWidth - 8 - logoWidth) * 0.75,
			y: 16 * 0.75,
			width: logoWidth * 0.75,
			height: logoHeight * 0.75,
		});
	}
	return pdf.save();
}

export async function downloadWeeklyPdf(report: WeeklyReport) {
	const bytes = await createWeeklyPdf(report);
	const url = URL.createObjectURL(
		new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${getWeeklyReportMessages(report.organizationLanguage).filePrefix}_${report.start}_${addDays(report.start, 6)}.pdf`;
	document.body.append(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
