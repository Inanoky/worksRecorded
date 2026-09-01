import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

import {
	type AllProjectsDiaryFilters,
	loadAllProjectsDiaryExportRecords,
} from "@/flows/default-construction/backend/all-projects-diary";
import { calculateDefaultConstructionManHours } from "@/flows/default-construction/lib/site-diary-summary";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import {
	getOrganizationIdByUserId,
	getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function optionalSearchParam(searchParams: URLSearchParams, key: string) {
	return searchParams.get(key) || undefined;
}

function getExportMessages(language: string | null) {
	if (language === "lv") {
		return {
			date: "Datums",
			project: "Projekts",
			location: "Vieta",
			work: "Darbs",
			unit: "Mērvienība",
			amount: "Daudzums",
			workers: "Darbinieki",
			hours: "Stundas",
			manHours: "Cilvēkstundas",
			comments: "Komentāri",
			source: "Avots",
			sheet: "Visi projekti",
		};
	}

	return {
		date: "Date",
		project: "Project",
		location: "Location",
		work: "Work",
		unit: "Unit",
		amount: "Amount",
		workers: "Workers",
		hours: "Hours",
		manHours: "Man-hours",
		comments: "Comments",
		source: "Source",
		sheet: "All projects",
	};
}

export async function GET(request: Request) {
	const { getUser } = getKindeServerSession();
	const user = await getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const [organizationId, organizationLanguage] = await Promise.all([
		getOrganizationIdByUserId(user.id),
		getOrganizationLanguageByUserId(user.id),
	]);
	if (!organizationId) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { searchParams } = new URL(request.url);
	const filters: AllProjectsDiaryFilters = {
		projectId: optionalSearchParam(searchParams, "project"),
		keyword: optionalSearchParam(searchParams, "q"),
		dateFrom: optionalSearchParam(searchParams, "from"),
		dateTo: optionalSearchParam(searchParams, "to"),
	};
	const records = await loadAllProjectsDiaryExportRecords(
		organizationId,
		filters,
	);
	const messages = getExportMessages(organizationLanguage);
	const locale = organizationLanguage === "lv" ? "lv-LV" : "en-GB";
	const dateFormatter = new Intl.DateTimeFormat(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "Europe/Riga",
	});
	const exportRows = records.map((record) => ({
		[messages.date]: dateFormatter.format(record.Date ?? record.createdAt),
		[messages.project]: record.Site?.name ?? "",
		[messages.location]: record.Location ?? "",
		[messages.work]: record.Works ?? "",
		[messages.unit]: record.Units ?? "",
		[messages.amount]: record.Amounts,
		[messages.workers]: record.WorkersInvolved,
		[messages.hours]: record.TimeInvolved,
		[messages.manHours]: calculateDefaultConstructionManHours(record),
		[messages.comments]: record.Comments ?? "",
		[messages.source]: [
			record.originalUserComment,
			record.originalAudioUrl,
		]
			.filter(Boolean)
			.join("\n"),
	}));

	const XLSX = await import("xlsx");
	const worksheet = XLSX.utils.json_to_sheet(exportRows);
	worksheet["!cols"] = [
		{ wch: 14 },
		{ wch: 28 },
		{ wch: 24 },
		{ wch: 30 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 14 },
		{ wch: 18 },
		{ wch: 50 },
		{ wch: 60 },
	];
	if (worksheet["!ref"]) {
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
	}

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, messages.sheet);
	const workbookBuffer = XLSX.write(workbook, {
		type: "buffer",
		bookType: "xlsx",
		compression: true,
	});
	const datePart = new Date().toISOString().slice(0, 10);

	return new Response(new Uint8Array(workbookBuffer), {
		headers: {
			"Cache-Control": "private, no-store",
			"Content-Disposition": `attachment; filename="all-projects-${datePart}.xlsx"`,
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
