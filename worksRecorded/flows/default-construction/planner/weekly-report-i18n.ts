import { normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

const messages = {
	lv: {
		locale: "lv-LV",
		title: "Būvdarbu žurnāls · Nedēļas atskaite",
		site: "Būvobjekts",
		subtitle: "Plāns un faktiskie darbi",
		continued: "turpinājums",
		legend:
			"Zaļš: plāns pārsniegts · Sarkans: plāns nav sasniegts · Nākotnes plāns bez faktiskajiem darbiem nav atzīmēts kā kavēts.",
		empty: "Nav plānotu vai faktisku darbu.",
		shared: "Kopīgs dienas plāns",
		dailyTotal: "Dienā kopā",
		tasks: "Uzdevumi",
		plannedTasks: "Plānoti darbi",
		dailyCost: "Dienas izmaksas",
		button: "Nedēļas PDF",
		loading: "Sagatavo nedēļas PDF…",
		hint: "Pašreizējā nedēļa (pirmdiena–svētdiena), visi saglabātie ieraksti un izvērsts plāns. A3 ainava.",
		error: "Neizdevās eksportēt nedēļas PDF. Mēģiniet vēlreiz.",
		longTitle: "Projekta nosaukums ir pārāk garš nedēļas PDF virsrakstam.",
		unsupported: "Šajā pārlūkā PDF eksports nav pieejams.",
		filePrefix: "Buvdarbu_zurnals",
		columns: [
			"Laiks",
			"Lokācija",
			"Plānotie darbi",
			"Darbi",
			"Mērv.",
			"Daudzums (plāns)",
			"Daudzums (fakts)",
			"Strādnieki",
			"Stundas",
			"Cilvēkstundas",
			"Izmaksas",
			"Komentāri",
		],
		status: {
			over: "Plāns pārsniegts",
			under: "Plāns nav sasniegts",
			equal: "Plāns izpildīts",
			unknown: "Nav faktiskā daudzuma",
			future: "Plānots",
			unplanned: "Neplānots darbs",
		},
	},
	en: {
		locale: "en-GB",
		title: "Site diary · Weekly report",
		site: "Construction site",
		subtitle: "Planned and actual work",
		continued: "continued",
		legend:
			"Green: plan exceeded · Red: below plan · Future plans without actual work are not marked as overdue.",
		empty: "No planned or actual work.",
		shared: "Shared daily plan",
		dailyTotal: "Daily total",
		tasks: "Tasks",
		plannedTasks: "Planned tasks",
		dailyCost: "Daily cost",
		button: "Weekly PDF",
		loading: "Preparing weekly PDF…",
		hint: "Current week (Monday–Sunday), all saved records with the plan expanded. A3 landscape.",
		error: "Could not export the weekly PDF. Please try again.",
		longTitle: "The project name is too long for the weekly PDF heading.",
		unsupported: "PDF export is not available in this browser.",
		filePrefix: "Site_diary",
		columns: [
			"Time",
			"Location",
			"Planned work",
			"Actual work",
			"Unit",
			"Quantity (planned)",
			"Quantity (actual)",
			"Workers",
			"Hours",
			"Person-hours",
			"Cost",
			"Comments",
		],
		status: {
			over: "Plan exceeded",
			under: "Below plan",
			equal: "Plan completed",
			unknown: "Actual quantity missing",
			future: "Planned",
			unplanned: "Unplanned work",
		},
	},
};

export function getWeeklyReportMessages(language?: string | null) {
	return messages[normalizeOrganizationLanguage(language)];
}

export function formatWeeklyReportDate(date: string, language?: string | null) {
	return new Intl.DateTimeFormat(getWeeklyReportMessages(language).locale, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00Z`));
}
