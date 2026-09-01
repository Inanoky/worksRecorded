import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectNavigationLink } from "@/components/providers/ProjectNavigationLink";
import { OriginalSourceContent } from "@/components/sitediary/OriginalSourceContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type AllProjectsDiaryFilters,
	loadAllProjectsDiary,
} from "@/flows/default-construction/backend/all-projects-diary";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { requireUser } from "@/lib/utils/requireUser";
import {
	getOrganizationIdByUserId,
	getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";

type AllProjectsSearchParams = Promise<
	Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

function isMissingOrZero(value: number | null | undefined) {
	return value == null || value === 0;
}

function pageHref(
	searchParams: Record<string, string | string[] | undefined>,
	page: number,
) {
	const params = new URLSearchParams();
	for (const key of ["project", "q", "from", "to"] as const) {
		const value = firstValue(searchParams[key]);
		if (value) params.set(key, value);
	}
	if (page > 1) params.set("page", String(page));
	const query = params.toString();
	return query ? `/dashboard/all-projects?${query}` : "/dashboard/all-projects";
}

function getMessages(language: string | null) {
	if (language === "lv") {
		return {
			title: "Visi projekti",
			description: "Visu projektu darbu ieraksti hronoloģiskā secībā.",
			back: "Atpakaļ uz projektiem",
			keyword: "Meklēt darbus, vietu vai komentārus",
			allProjects: "Visi projekti",
			from: "No datuma",
			to: "Līdz datumam",
			filter: "Filtrēt",
			clear: "Notīrīt",
			date: "Datums",
			project: "Projekts",
			location: "Vieta",
			work: "Darbs",
			amount: "Daudzums",
			workers: "Darbinieki",
			hours: "Stundas",
			comments: "Komentāri",
			source: "Avots",
			showSource: "Rādīt avotu",
			openingProject: "Atver projektu...",
			noRecords: "Atbilstoši ieraksti nav atrasti.",
			previous: "Iepriekšējā",
			next: "Nākamā",
			records: "ieraksti",
		};
	}

	return {
		title: "All projects",
		description: "Work records from every project in chronological order.",
		back: "Back to projects",
		keyword: "Search work, location, or comments",
		allProjects: "All projects",
		from: "From date",
		to: "To date",
		filter: "Filter",
		clear: "Clear",
		date: "Date",
		project: "Project",
		location: "Location",
		work: "Work",
		amount: "Amount",
		workers: "Workers",
		hours: "Hours",
		comments: "Comments",
		source: "Source",
		showSource: "Show source",
		openingProject: "Opening project...",
		noRecords: "No matching records found.",
		previous: "Previous",
		next: "Next",
		records: "records",
	};
}

export default async function AllProjectsPage({
	searchParams,
}: {
	searchParams: AllProjectsSearchParams;
}) {
	const user = await requireUser();
	const rawSearchParams = await searchParams;
	const [organizationId, organizationLanguage] = await Promise.all([
		getOrganizationIdByUserId(user.id),
		getOrganizationLanguageByUserId(user.id),
	]);

	if (!organizationId) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) notFound();

	const filters: AllProjectsDiaryFilters = {
		page: parsePage(firstValue(rawSearchParams.page)),
		projectId: firstValue(rawSearchParams.project),
		keyword: firstValue(rawSearchParams.q),
		dateFrom: firstValue(rawSearchParams.from),
		dateTo: firstValue(rawSearchParams.to),
	};
	const data = await loadAllProjectsDiary(organizationId, filters);
	const messages = getMessages(organizationLanguage);
	const locale = organizationLanguage === "lv" ? "lv-LV" : "en-GB";
	const dateFormatter = new Intl.DateTimeFormat(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "Europe/Riga",
	});
	const numberFormatter = new Intl.NumberFormat(locale, {
		maximumFractionDigits: 2,
	});

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-6 py-4">
			<div className="space-y-2">
				<Button asChild variant="ghost" className="px-0">
					<Link href="/dashboard">← {messages.back}</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">
						{messages.title}
					</h1>
					<p className="text-muted-foreground">{messages.description}</p>
				</div>
			</div>

			<Card>
				<CardContent className="pt-6">
					<form
						action="/dashboard/all-projects"
						className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_170px_170px_auto]"
					>
						<Input
							name="q"
							defaultValue={filters.keyword}
							placeholder={messages.keyword}
							aria-label={messages.keyword}
						/>
						<select
							name="project"
							defaultValue={filters.projectId ?? ""}
							aria-label={messages.project}
							className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<option value="">{messages.allProjects}</option>
							{data.projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
						<Input
							name="from"
							type="date"
							defaultValue={filters.dateFrom}
							aria-label={messages.from}
						/>
						<Input
							name="to"
							type="date"
							defaultValue={filters.dateTo}
							aria-label={messages.to}
						/>
						<div className="flex gap-2">
							<Button type="submit">{messages.filter}</Button>
							<Button asChild variant="outline">
								<Link href="/dashboard/all-projects">{messages.clear}</Link>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex-row items-center justify-between gap-4">
					<CardTitle>{messages.title}</CardTitle>
					<span className="text-sm text-muted-foreground">
						{numberFormatter.format(data.totalCount)} {messages.records}
					</span>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{messages.date}</TableHead>
									<TableHead>{messages.project}</TableHead>
									<TableHead>{messages.location}</TableHead>
									<TableHead>{messages.work}</TableHead>
									<TableHead className="text-right">
										{messages.amount}
									</TableHead>
									<TableHead className="text-right">
										{messages.workers}
									</TableHead>
									<TableHead className="text-right">{messages.hours}</TableHead>
									<TableHead className="min-w-72">
										{messages.comments}
									</TableHead>
									<TableHead className="text-center">
										{messages.source}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.records.length ? (
									data.records.map((record) => (
										<TableRow key={record.id}>
											<TableCell className="whitespace-nowrap">
												{dateFormatter.format(record.Date ?? record.createdAt)}
											</TableCell>
											<TableCell className="font-medium">
												{record.siteId ? (
													<ProjectNavigationLink
														projectId={record.siteId}
														projectName={record.Site?.name ?? "—"}
														loadingLabel={messages.openingProject}
													/>
												) : (
													(record.Site?.name ?? "—")
												)}
											</TableCell>
											<TableCell>{record.Location || "—"}</TableCell>
											<TableCell>{record.Works || "—"}</TableCell>
											<TableCell className="whitespace-nowrap text-right tabular-nums">
												{isMissingOrZero(record.Amounts)
													? "—"
													: `${numberFormatter.format(record.Amounts)} ${record.Units ?? ""}`.trim()}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{isMissingOrZero(record.WorkersInvolved)
													? "—"
													: numberFormatter.format(record.WorkersInvolved)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{isMissingOrZero(record.TimeInvolved)
													? "—"
													: numberFormatter.format(record.TimeInvolved)}
											</TableCell>
											<TableCell className="max-w-xl whitespace-normal">
												{record.Comments || "—"}
											</TableCell>
											<TableCell className="text-center">
												{record.originalUserComment ||
												record.originalAudioUrl ? (
													<Popover>
														<PopoverTrigger asChild>
															<button
																type="button"
																aria-label={messages.showSource}
																className="inline-flex size-7 items-center justify-center rounded-full border border-blue-600 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800"
															>
																?
															</button>
														</PopoverTrigger>
														<PopoverContent className="max-h-[70vh] w-[min(90vw,28rem)] overflow-y-auto">
															<OriginalSourceContent
																originalUserComment={record.originalUserComment}
																originalAudioUrl={record.originalAudioUrl}
															/>
														</PopoverContent>
													</Popover>
												) : (
													"—"
												)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={9} className="h-32 text-center">
											{messages.noRecords}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{data.totalPages > 1 ? (
						<div className="mt-4 flex items-center justify-between gap-4">
							{data.page > 1 ? (
								<Button asChild variant="outline">
									<Link href={pageHref(rawSearchParams, data.page - 1)}>
										{messages.previous}
									</Link>
								</Button>
							) : (
								<Button variant="outline" disabled>
									{messages.previous}
								</Button>
							)}
							<span className="text-sm text-muted-foreground">
								{data.page} / {data.totalPages}
							</span>
							{data.page < data.totalPages ? (
								<Button asChild variant="outline">
									<Link href={pageHref(rawSearchParams, data.page + 1)}>
										{messages.next}
									</Link>
								</Button>
							) : (
								<Button variant="outline" disabled>
									{messages.next}
								</Button>
							)}
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
