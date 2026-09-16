import Link from "next/link";
import Image from "next/image";
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
import {
  getDefaultConstructionQuantityStatusLabel,
  getDefaultConstructionQuantityToneClass,
} from "@/flows/default-construction/lib/quantity-plan-actual";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import {
  SB_STOMME_ORGANIZATION_ID,
  SB_PLAN_LABELS,
} from "@/flows/default-construction/sb-stomme-inline-plan/model";
import {
  SbPlanProvider,
  SbPlanText,
  SbRowActions,
  SbExportLink,
} from "@/flows/default-construction/sb-stomme-inline-plan/InlinePlan";
import { requireUser } from "@/lib/utils/requireUser";
import { cn } from "@/lib/utils/utils";
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

function formatQuantity(
  value: number | null | undefined,
  units: string | null | undefined,
  formatter: Intl.NumberFormat,
) {
  return isMissingOrZero(value)
    ? "—"
    : `${formatter.format(value)} ${units ?? ""}`.trim();
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

function exportHref(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const key of ["project", "q", "from", "to"] as const) {
    const value = firstValue(searchParams[key]);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query
    ? `/api/all-projects/export?${query}`
    : "/api/all-projects/export";
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
      plannedAmount: "Daudzums (plāns)",
      actualAmount: "Daudzums (fakts)",
      workers: "Darbinieki",
      hours: "Stundas",
      cost: "Izmaksas",
      comments: "Komentāri",
      source: "Avots",
      showSource: "Rādīt avotu",
      openingProject: "Atver projektu...",
      noRecords: "Atbilstoši ieraksti nav atrasti.",
      previous: "Iepriekšējā",
      next: "Nākamā",
      records: "ieraksti",
      exportToExcel: "Eksportēt uz Excel",
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
    plannedAmount: "Quantity (plan)",
    actualAmount: "Quantity (actual)",
    workers: "Workers",
    hours: "Hours",
    cost: "Cost",
    comments: "Comments",
    source: "Source",
    showSource: "Show source",
    openingProject: "Opening project...",
    noRecords: "No matching records found.",
    previous: "Previous",
    next: "Next",
    records: "records",
    exportToExcel: "Export to Excel",
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
  const isSbStomme = organizationId === SB_STOMME_ORGANIZATION_ID;
  const showPlannedAmount = isSbStomme || data.quantityPlanFactEnabled;
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
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const content = (
    <div className="mx-auto w-full max-w-[1900px] space-y-6 px-2 py-4 sm:px-4">
      <div className="space-y-2">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/dashboard">← {messages.back}</Link>
        </Button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {messages.title}
            </h1>
            <p className="text-muted-foreground">{messages.description}</p>
          </div>
          {isSbStomme ? (
            <Image
              src="/sb-stomme-logo.png"
              alt="SB STOMME AB"
              width={1086}
              height={924}
              className="h-auto w-20 shrink-0 rounded sm:w-24"
            />
          ) : null}
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
        <CardHeader className="gap-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <CardTitle>{messages.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm text-muted-foreground">
              {numberFormatter.format(data.totalCount)} {messages.records}
            </span>
            {isSbStomme ? (
              <SbExportLink href={exportHref(rawSearchParams)}>
                {messages.exportToExcel}
              </SbExportLink>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href={exportHref(rawSearchParams)}>
                  {messages.exportToExcel}
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-3 lg:hidden">
            {data.records.length ? (
              data.records.map((record) => (
                <article
                  key={record.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 shadow-sm",
                    getDefaultConstructionQuantityToneClass(
                      record.quantityComparisonStatus,
                    ),
                  )}
                  aria-label={
                    getDefaultConstructionQuantityStatusLabel(
                      record.quantityComparisonStatus,
                      organizationLanguage,
                    ) ?? undefined
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm font-semibold">
                      {record.siteId ? (
                        <ProjectNavigationLink
                          projectId={record.siteId}
                          projectName={record.Site?.name ?? "—"}
                          loadingLabel={messages.openingProject}
                        />
                      ) : (
                        (record.Site?.name ?? "—")
                      )}
                    </div>
                    <time
                      dateTime={(record.Date ?? record.createdAt).toISOString()}
                      className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground"
                    >
                      {dateFormatter.format(record.Date ?? record.createdAt)}
                    </time>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {isSbStomme ? (
                      <div className="space-y-3">
                        <SbPlanText
                          recordId={record.id}
                          field="weather"
                          showLabel
                        />
                        <SbPlanText
                          recordId={record.id}
                          field="plannedWork"
                          showLabel
                        />
                        <p className="text-xs text-muted-foreground">
                          {SB_PLAN_LABELS.actualWork}
                        </p>
                      </div>
                    ) : null}
                    <p className="break-words text-sm font-semibold leading-5">
                      {record.Works || "—"}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {messages.location}:
                      </span>{" "}
                      {record.Location || "—"}
                    </p>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
                    {showPlannedAmount ? (
                      <div className="bg-muted/40 p-2.5">
                        <dt className="text-[11px] text-muted-foreground">
                          {isSbStomme
                            ? SB_PLAN_LABELS.plannedAmount
                            : messages.plannedAmount}
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                          {isSbStomme ? (
                            <SbPlanText
                              recordId={record.id}
                              field="plannedAmount"
                              unit={record.Units}
                            />
                          ) : isMissingOrZero(record.plannedAmount) ? (
                            "—"
                          ) : (
                            `${numberFormatter.format(record.plannedAmount)} ${record.Units ?? ""}`.trim()
                          )}
                        </dd>
                      </div>
                    ) : null}
                    <div className="bg-muted/40 p-2.5">
                      <dt className="text-[11px] text-muted-foreground">
                        {isSbStomme
                          ? SB_PLAN_LABELS.actualAmount
                          : data.quantityPlanFactEnabled
                            ? messages.actualAmount
                            : messages.amount}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                        {formatQuantity(
                          (
                            isSbStomme
                              ? record.quantityPlanFactEnabled
                              : data.quantityPlanFactEnabled
                          )
                            ? record.actualAmount
                            : record.Amounts,
                          record.Units,
                          numberFormatter,
                        )}
                      </dd>
                    </div>
                    <div className="bg-muted/40 p-2.5">
                      <dt className="text-[11px] text-muted-foreground">
                        {messages.cost}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                        {record.actualCost == null
                          ? "—"
                          : currencyFormatter.format(record.actualCost)}
                      </dd>
                    </div>
                    <div className="bg-muted/40 p-2.5">
                      <dt className="text-[11px] text-muted-foreground">
                        {messages.workers}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                        {isMissingOrZero(record.WorkersInvolved)
                          ? "—"
                          : numberFormatter.format(record.WorkersInvolved)}
                      </dd>
                    </div>
                    <div className="bg-muted/40 p-2.5">
                      <dt className="text-[11px] text-muted-foreground">
                        {messages.hours}
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                        {isMissingOrZero(record.TimeInvolved)
                          ? "—"
                          : numberFormatter.format(record.TimeInvolved)}
                      </dd>
                    </div>
                  </dl>
                  {(() => {
                    const label = getDefaultConstructionQuantityStatusLabel(
                      record.quantityComparisonStatus,
                      organizationLanguage,
                    );
                    return label &&
                      record.quantityComparisonStatus !== "on-plan" ? (
                      <p className="mt-2 text-xs font-semibold">{label}</p>
                    ) : null;
                  })()}

                  <div className="mt-3 border-t pt-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {messages.comments}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">
                      {record.Comments || "—"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {messages.source}
                    </span>
                    {record.originalUserComment || record.originalAudioUrl ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center justify-center rounded-full border border-blue-600 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                          >
                            {messages.showSource}
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
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                    {isSbStomme ? (
                      <SbRowActions
                        recordId={record.id}
                        label={`${record.Site?.name ?? "—"} · ${dateFormatter.format(record.Date ?? record.createdAt)}`}
                      />
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                {messages.noRecords}
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-md border lg:block">
            <Table
              className={cn(
                "table-fixed",
                isSbStomme
                  ? "min-w-[1720px]"
                  : data.quantityPlanFactEnabled
                    ? "min-w-[1760px]"
                    : "min-w-[1620px]",
              )}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className={isSbStomme ? "w-[94px]" : "w-[100px]"}>
                    {messages.date}
                  </TableHead>
                  <TableHead className={isSbStomme ? "w-[140px]" : "w-[200px]"}>
                    {messages.project}
                  </TableHead>
                  {isSbStomme ? (
                    <TableHead className="w-[120px]">
                      {SB_PLAN_LABELS.weather}
                    </TableHead>
                  ) : null}
                  <TableHead className={isSbStomme ? "w-[100px]" : "w-[140px]"}>
                    {messages.location}
                  </TableHead>
                  {isSbStomme ? (
                    <TableHead className="w-[160px]">
                      {SB_PLAN_LABELS.plannedWork}
                    </TableHead>
                  ) : null}
                  <TableHead className={isSbStomme ? "w-[164px]" : "w-[240px]"}>
                    {isSbStomme ? SB_PLAN_LABELS.actualWork : messages.work}
                  </TableHead>
                  {showPlannedAmount ? (
                    <TableHead
                      className={
                        isSbStomme
                          ? "w-[120px] whitespace-normal text-right"
                          : "w-[140px] whitespace-nowrap text-right"
                      }
                    >
                      {isSbStomme
                        ? SB_PLAN_LABELS.plannedAmount
                        : messages.plannedAmount}
                    </TableHead>
                  ) : null}
                  <TableHead
                    className={
                      isSbStomme
                        ? "w-[120px] whitespace-normal text-right"
                        : "w-[140px] whitespace-nowrap text-right"
                    }
                  >
                    {isSbStomme
                      ? SB_PLAN_LABELS.actualAmount
                      : data.quantityPlanFactEnabled
                        ? messages.actualAmount
                        : messages.amount}
                  </TableHead>
                  <TableHead
                    className={cn(
                      "whitespace-nowrap text-right",
                      isSbStomme ? "w-[88px]" : "w-[104px]",
                    )}
                  >
                    {messages.workers}
                  </TableHead>
                  <TableHead
                    className={cn(
                      "whitespace-nowrap text-right",
                      isSbStomme ? "w-[80px]" : "w-[96px]",
                    )}
                  >
                    {messages.hours}
                  </TableHead>
                  <TableHead
                    className={cn(
                      "whitespace-nowrap text-right",
                      isSbStomme ? "w-[100px]" : "w-[130px]",
                    )}
                  >
                    {messages.cost}
                  </TableHead>
                  <TableHead className={isSbStomme ? "w-[220px]" : "w-[400px]"}>
                    {messages.comments}
                  </TableHead>
                  <TableHead
                    className={cn(
                      "text-center",
                      isSbStomme ? "w-[60px]" : "w-[72px]",
                    )}
                  >
                    {messages.source}
                  </TableHead>
                  {isSbStomme ? (
                    <TableHead className="w-[56px]">
                      <span className="sr-only">Darbības</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.length ? (
                  data.records.map((record) => (
                    <TableRow
                      key={record.id}
                      className={getDefaultConstructionQuantityToneClass(
                        record.quantityComparisonStatus,
                      )}
                      aria-label={
                        getDefaultConstructionQuantityStatusLabel(
                          record.quantityComparisonStatus,
                          organizationLanguage,
                        ) ?? undefined
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        {dateFormatter.format(record.Date ?? record.createdAt)}
                      </TableCell>
                      <TableCell className="min-w-0 overflow-hidden font-medium">
                        <div
                          className="truncate"
                          title={record.Site?.name ?? undefined}
                        >
                          {record.siteId ? (
                            <ProjectNavigationLink
                              projectId={record.siteId}
                              projectName={record.Site?.name ?? "—"}
                              loadingLabel={messages.openingProject}
                            />
                          ) : (
                            (record.Site?.name ?? "—")
                          )}
                        </div>
                      </TableCell>
                      {isSbStomme ? (
                        <TableCell className="align-top">
                          <SbPlanText recordId={record.id} field="weather" />
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-0 overflow-hidden">
                        <span
                          className="block truncate"
                          title={record.Location || undefined}
                        >
                          {record.Location || "—"}
                        </span>
                      </TableCell>
                      {isSbStomme ? (
                        <TableCell className="align-top">
                          <SbPlanText
                            recordId={record.id}
                            field="plannedWork"
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="min-w-0 overflow-hidden">
                        <span
                          className="block truncate"
                          title={record.Works || undefined}
                        >
                          {record.Works || "—"}
                        </span>
                      </TableCell>
                      {showPlannedAmount ? (
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {isSbStomme ? (
                            <SbPlanText
                              recordId={record.id}
                              field="plannedAmount"
                              unit={record.Units}
                            />
                          ) : isMissingOrZero(record.plannedAmount) ? (
                            "—"
                          ) : (
                            `${numberFormatter.format(record.plannedAmount)} ${record.Units ?? ""}`.trim()
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatQuantity(
                          (
                            isSbStomme
                              ? record.quantityPlanFactEnabled
                              : data.quantityPlanFactEnabled
                          )
                            ? record.actualAmount
                            : record.Amounts,
                          record.Units,
                          numberFormatter,
                        )}
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
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {record.actualCost == null
                          ? "—"
                          : currencyFormatter.format(record.actualCost)}
                      </TableCell>
                      <TableCell className="min-w-0 align-top">
                        <span className="block whitespace-pre-wrap break-words text-sm leading-5">
                          {record.Comments || "—"}
                        </span>
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
                      {isSbStomme ? (
                        <TableCell className="text-center">
                          <SbRowActions
                            recordId={record.id}
                            label={`${record.Site?.name ?? "—"} · ${dateFormatter.format(record.Date ?? record.createdAt)}`}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        isSbStomme ? 14 : data.quantityPlanFactEnabled ? 11 : 10
                      }
                      className="h-32 text-center"
                    >
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
  return isSbStomme ? (
    <SbPlanProvider
      key={data.records.map((record) => record.id).join(":")}
      records={data.records.map((record) => ({
        id: record.id,
        values: record.sbPlan!,
      }))}
    >
      {content}
    </SbPlanProvider>
  ) : (
    content
  );
}
