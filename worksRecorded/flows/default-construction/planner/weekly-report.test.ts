import { weeklyReportPages } from "./weekly-pdf";
import {
	escapeReportText,
	type WeeklyReport,
	weeklyReportDays,
} from "./weekly-report";

const plan = {
	id: "plan",
	version: 1,
	date: "2026-09-17",
	work: "Apdares darbi",
	location: "1. stāvs",
	unit: "m2",
	quantity: 12,
};
const actual = {
	id: "actual",
	date: plan.date,
	work: plan.work,
	location: plan.location,
	unit: plan.unit,
	quantity: 10,
	comments: "Samontētas 3 sienas.",
	time: "12:00",
	workers: 2,
	hours: 3,
	manHours: 6,
	cost: 50,
};
const report: WeeklyReport = {
	organizationId: "other-organization",
	organizationLanguage: "lv",
	start: "2026-09-14",
	today: "2026-09-16",
	siteName: "Būvobjekts",
	plans: [plan],
	actuals: [actual, { ...actual, id: "second", quantity: 10 }],
	options: { works: [], locations: [], units: [] },
};
const context = {
	font: "",
	measureText: (value: string) => ({ width: value.length * 6 }),
} as CanvasRenderingContext2D;

it("reserves header space only for SB STOMME on every page", () => {
	for (const organizationId of [
		"73bfa5f9-9e49-460e-876e-8d9eb58ba2cb",
		"other-organization",
	]) {
		const pages = weeklyReportPages(
			{ ...report, organizationId },
			context,
			"Arial",
		);
		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) {
			expect(page).toContain(
				`padding-right:${organizationId === "other-organization" ? 0 : 144}px`,
			);
			expect(page).toContain("WorksRecorded.com");
		}
	}
});

it("includes all seven days and uses one shared plan for repeated actuals", () => {
	const days = weeklyReportDays(report);
	expect(days).toHaveLength(7);
	expect(days[0].date).toBe("2026-09-14");
	expect(days[6].date).toBe("2026-09-20");
	expect(days[3].rows[0]).toMatchObject({
		status: "over",
		note: "Plāns pārsniegts\nDienā kopā: 20 m2",
	});
	expect(days[3].rows[0].cells[5]).toBe("12");
	expect(days[3].rows[1].cells[5]).toBe("Kopīgs dienas plāns");
	expect(days[3].summary).toContain("100,00");
});

it("includes planned-only and actual-only rows with dash placeholders", () => {
	const days = weeklyReportDays({
		...report,
		actuals: [
			{
				...actual,
				work: "Papildu darbi",
				quantity: null,
				workers: 0,
				hours: null,
				manHours: null,
				cost: null,
			},
		],
	});
	expect(days[3].rows).toHaveLength(2);
	expect(days[3].rows[0].cells[2]).toBe("—");
	expect(days[3].rows[0].cells[6]).toBe("—");
	expect(days[3].rows[1]).toMatchObject({ status: "future" });
	expect(days[3].rows[1].cells[3]).toBe("—");
});

it("paginates long comments without truncation and repeats headings and page numbers", () => {
	const comments = Array.from(
		{ length: 1600 },
		(_, index) => `Teksts${index}`,
	).join(" ");
	const pages = weeklyReportPages(
		{ ...report, actuals: [{ ...actual, comments }] },
		context,
		"Arial",
	);
	expect(pages.length).toBeGreaterThan(2);
	const all = pages.join(" ");
	expect(all).toContain("Teksts1599");
	expect(all.match(/Teksts1599/g)).toHaveLength(1);
	for (const [index, page] of pages.entries()) {
		expect(page.match(/WorksRecorded\.com/g)).toHaveLength(1);
		expect(page).toContain("justify-content:space-between;height:32px");
		expect(page).toContain("Plānotie darbi");
		expect(page).toContain("Daudzums (plāns)");
		expect(page).toContain(`${index + 1} / ${pages.length}`);
	}
});

it("escapes source text and keeps Latvian characters", () => {
	expect(escapeReportText('<img src="x"/> Āģēņš &')).toBe(
		"&lt;img src=&quot;x&quot;/&gt; Āģēņš &amp;",
	);
});

it("localizes English labels, dates and decimals without translating entered content", () => {
	const english = {
		...report,
		organizationLanguage: "en",
		actuals: [{ ...actual, quantity: 12.5, cost: 1234.56 }],
	};
	const day = weeklyReportDays(english)[3];
	expect(day.title).toContain("September");
	expect(day.summary).toContain("Tasks: 1");
	expect(day.summary).toContain("€1,234.56");
	expect(day.rows[0].cells[6]).toBe("12.5");
	expect(day.rows[0].cells[3]).toBe("Apdares darbi");
	expect(day.rows[0].cells[11]).toBe(actual.comments);
	expect(day.rows[0].note).toBe("Plan exceeded");
	const html = weeklyReportPages(english, context, "Arial").join("");
	for (const label of [
		"Site diary · Weekly report",
		"Quantity (planned)",
		"Quantity (actual)",
		"No planned or actual work.",
		"14/09/2026",
		"20/09/2026",
	])
		expect(html).toContain(label);
	expect(html).not.toContain("Nedēļas atskaite");
	expect(html).not.toContain("Plāns pārsniegts");
});

it("uses Latvian decimal separators and the shared application language fallback", () => {
	expect(
		weeklyReportDays({ ...report, actuals: [{ ...actual, quantity: 12.5 }] })[3]
			.rows[0].cells[6],
	).toBe("12,5");
	for (const language of [undefined, null, "unsupported"]) {
		expect(
			weeklyReportPages(
				{ ...report, organizationLanguage: language },
				context,
				"Arial",
			).join(""),
		).toContain("Site diary · Weekly report");
	}
});
