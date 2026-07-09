import Link from "next/link";
import { AlertTriangle, ArrowLeft, Clock, Filter, Gauge, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAiEvalUiEnabled } from "@/lib/ai-evals/local-gate";
import {
  type AnomalySeverity,
  type EvalStatus,
  type NormalizedEvalItem,
  type NormalizedEvalRun,
  loadEvalReports,
} from "@/lib/ai-evals/report-loader";
import { cn } from "@/lib/utils/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${value}ms` : "n/a";
}

function formatTokens(value: number | null) {
  return value === null ? "n/a" : new Intl.NumberFormat("en").format(value);
}

function totalRunTokens(run: NormalizedEvalRun) {
  const values = run.items.map((item) => item.tokenTotal).filter((value): value is number => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function statusClass(status: EvalStatus | "skipped") {
  if (status === "fail") return "border-red-200 bg-red-50 text-red-700";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function severityClass(severity: AnomalySeverity) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function flowLabel(flow: string) {
  return flow.replace(/-/g, " ");
}

function textMatchesRun(run: NormalizedEvalRun, query: string) {
  if (!query) return true;
  const haystack = [
    run.fileName,
    run.runId,
    run.flow,
    run.model,
    ...run.items.flatMap((item) => [
      item.caseId,
      item.input,
      item.answer,
      item.judgeExplanation,
      ...item.judgeImprovements,
      ...item.outboundMessages,
      ...item.failedValidators.flatMap((validator) => [validator.name, validator.message]),
    ]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase("lv-LV");

  return haystack.includes(query.toLocaleLowerCase("lv-LV"));
}

function matchesStatus(run: NormalizedEvalRun, status: string) {
  if (!status || status === "all") return true;
  if (status === "anomaly") return run.anomalies.length > 0;
  return run.status === status;
}

function filterRuns(
  reports: NormalizedEvalRun[],
  args: { flow: string; status: string; model: string; slowOnly: boolean; query: string },
) {
  return reports.filter((run) => {
    if (args.flow && args.flow !== "all" && run.flow !== args.flow) return false;
    if (!matchesStatus(run, args.status)) return false;
    if (args.model && args.model !== "all" && run.model !== args.model && run.requestedModel !== args.model) return false;
    if (args.slowOnly && !Array.isArray(run.latency.casesOverThreshold) && !Array.isArray(run.latency.turnsOverThreshold)) {
      return false;
    }
    if (args.slowOnly) {
      const slowCases = Array.isArray(run.latency.casesOverThreshold)
        ? run.latency.casesOverThreshold
        : Array.isArray(run.latency.turnsOverThreshold)
          ? run.latency.turnsOverThreshold
          : [];
      if (slowCases.length === 0) return false;
    }
    return textMatchesRun(run, args.query);
  });
}

function queryString(params: Record<string, string | undefined>) {
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) url.set(key, value);
  }
  const serialized = url.toString();
  return serialized ? `?${serialized}` : "";
}

function getReviewItems(run: NormalizedEvalRun) {
  return [...run.items].sort((left, right) => {
    const leftScore = left.anomalies.length * 10 + (left.status === "fail" ? 5 : left.status === "warn" ? 2 : 0);
    const rightScore = right.anomalies.length * 10 + (right.status === "fail" ? 5 : right.status === "warn" ? 2 : 0);
    return rightScore - leftScore || right.latencyMs - left.latencyMs;
  });
}

function countBySeverity(runs: NormalizedEvalRun[], severity: AnomalySeverity) {
  return runs.reduce((total, run) => total + run.anomalies.filter((item) => item.severity === severity).length, 0);
}

function renderJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function QualityBadges({ item }: { item: NormalizedEvalItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className={cn("capitalize", statusClass(item.status))}>
        {item.status}
      </Badge>
      {item.judgeStatus !== "unknown" ? (
        <Badge variant="outline" className={cn("capitalize", statusClass(item.judgeStatus))}>
          judge {item.judgeStatus}
        </Badge>
      ) : null}
      {item.failedValidators.length ? (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          {item.failedValidators.length} failed {item.failedValidators.length === 1 ? "validator" : "validators"}
        </Badge>
      ) : null}
      {item.anomalies.map((anomaly) => (
        <Badge key={`${anomaly.code}-${anomaly.message}`} variant="outline" className={severityClass(anomaly.severity)}>
          {anomaly.code}
        </Badge>
      ))}
    </div>
  );
}

function ResponseBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="whitespace-pre-wrap break-words text-sm leading-6">{children || "No content captured."}</div>
    </div>
  );
}

function JudgeResponse({ item }: { item: NormalizedEvalItem }) {
  const wasRun = item.judgeStatus !== "skipped" && item.judgeStatus !== "unknown";

  return (
    <div className="mt-3 rounded-md border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Judge</div>
        <Badge variant="outline" className={cn("capitalize", statusClass(item.judgeStatus))}>
          {item.judgeStatus}
        </Badge>
      </div>

      {wasRun ? (
        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-1 font-medium">Explanation</div>
            <p className="whitespace-pre-wrap break-words leading-6">
              {item.judgeExplanation || "No explanation returned."}
            </p>
          </div>
          <div>
            <div className="mb-1 font-medium">Suggested improvements</div>
            {item.judgeImprovements.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {item.judgeImprovements.map((improvement, index) => (
                  <li key={`${index}-${improvement}`}>{improvement}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No improvements suggested.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {item.judgeExplanation || "Judge was not run for this item. Run the eval with --judge to capture its review."}
        </p>
      )}
    </div>
  );
}

function ItemDetail({ item }: { item: NormalizedEvalItem }) {
  return (
    <details className="group rounded-md border bg-background p-3">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium">{item.label}</div>
          <div className="mt-1 truncate text-sm text-muted-foreground">{item.input || "No prompt/input preview"}</div>
          {item.failedValidators.length ? (
            <div className="mt-1 truncate text-xs text-red-700">
              Failed: {item.failedValidators.map((validator) => validator.name || "unnamed-validator").join(", ")}
            </div>
          ) : null}
        </div>
        <div className="shrink-0">
          <QualityBadges item={item} />
        </div>
      </summary>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ResponseBlock title="Input">{item.input}</ResponseBlock>
        <ResponseBlock title="LLM Answer">{item.answer}</ResponseBlock>
        <ResponseBlock title="Outbound WhatsApp Text">
          {item.outboundMessages.length ? item.outboundMessages.join("\n\n") : ""}
        </ResponseBlock>
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Runtime</div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Latency</dt>
            <dd>{formatMs(item.latencyMs)}</dd>
            <dt className="text-muted-foreground">Actual model</dt>
            <dd className="break-all">{item.actualModel ?? "n/a"}</dd>
            <dt className="text-muted-foreground">Finish reason</dt>
            <dd>{item.finishReason ?? "n/a"}</dd>
            <dt className="text-muted-foreground">Tokens</dt>
            <dd>{formatTokens(item.tokenTotal)}</dd>
            <dt className="text-muted-foreground">Input / output</dt>
            <dd>{formatTokens(item.tokenInput)} / {formatTokens(item.tokenOutput)}</dd>
            {item.contextTokens.original !== null ? (
              <>
                <dt className="text-muted-foreground">Context before</dt>
                <dd>{formatTokens(item.contextTokens.original)} est.</dd>
                <dt className="text-muted-foreground">After compaction</dt>
                <dd>{formatTokens(item.contextTokens.compacted)} est.</dd>
                <dt className="text-muted-foreground">Context saved</dt>
                <dd>{formatTokens(item.contextTokens.saved)} est.</dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {item.failedValidators.length ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          <div className="mb-2 font-medium text-red-900">Failed validators</div>
          <ul className="space-y-2">
            {item.failedValidators.map((validator, index) => (
              <li key={`${validator.name}-${index}`} className="text-red-900">
                <span className="font-medium">{validator.name || "unnamed-validator"}:</span>{" "}
                {validator.message || "No failure message was provided."}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.anomalies.length ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="mb-2 font-medium text-amber-900">Anomaly highlights</div>
          <ul className="space-y-1">
            {item.anomalies.map((anomaly) => (
              <li key={`${anomaly.code}-${anomaly.message}`} className="text-amber-900">
                <span className="font-medium">{anomaly.code}:</span> {anomaly.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <JudgeResponse item={item} />

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Validation checks</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-50">
            {renderJson(item.validationResults)}
          </pre>
        </details>
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Raw artifacts</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-50">
            {renderJson(item.artifacts)}
          </pre>
        </details>
      </div>
    </details>
  );
}

export default async function AiEvalViewerPage({ searchParams }: PageProps) {
  requireAiEvalUiEnabled();

  const params = (await searchParams) ?? {};
  const flow = readParam(params.flow) ?? "all";
  const status = readParam(params.status) ?? "all";
  const model = readParam(params.model) ?? "all";
  const query = readParam(params.q) ?? "";
  const slowOnly = readParam(params.slow) === "true";
  const selectedRunId = readParam(params.run);

  const reports = await loadEvalReports();
  const flows = Array.from(new Set(reports.map((run) => run.flow))).sort();
  const models = Array.from(new Set(reports.flatMap((run) => [run.model, run.requestedModel]).filter((item): item is string => Boolean(item)))).sort();
  const filteredRuns = filterRuns(reports, { flow, status, model, slowOnly, query });
  const selectedRun =
    filteredRuns.find((run) => run.runId === selectedRunId || run.fileName === selectedRunId) ?? filteredRuns[0] ?? null;
  const reviewItems = selectedRun ? getReviewItems(selectedRun) : [];

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4" />
              Local AI eval review
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Response Quality</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Scan local eval reports for response quality issues, unusual runtime behavior, and anomalies that deterministic pass/fail can miss.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-slate-300 bg-white">
            {reports.length} reports found
          </Badge>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Card className="rounded-lg py-4">
            <CardHeader className="px-4">
              <CardDescription>Critical anomalies</CardDescription>
              <CardTitle className="text-2xl">{countBySeverity(filteredRuns, "critical")}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg py-4">
            <CardHeader className="px-4">
              <CardDescription>Warnings</CardDescription>
              <CardTitle className="text-2xl">{countBySeverity(filteredRuns, "warning")}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg py-4">
            <CardHeader className="px-4">
              <CardDescription>Info highlights</CardDescription>
              <CardTitle className="text-2xl">{countBySeverity(filteredRuns, "info")}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-lg py-4">
            <CardHeader className="px-4">
              <CardDescription>Filtered runs</CardDescription>
              <CardTitle className="text-2xl">{filteredRuns.length}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card className="rounded-lg py-4">
          <CardContent className="px-4">
            <form className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search run, case, prompt, answer"
                  className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                />
              </label>
              <select name="flow" defaultValue={flow} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All flows</option>
                {flows.map((item) => (
                  <option key={item} value={item}>
                    {flowLabel(item)}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All statuses</option>
                <option value="anomaly">Has anomaly</option>
                <option value="fail">Fail</option>
                <option value="warn">Warn</option>
                <option value="pass">Pass</option>
              </select>
              <select name="model" defaultValue={model} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All models</option>
                {models.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                <input name="slow" value="true" defaultChecked={slowOnly} type="checkbox" />
                Slow only
              </label>
              <button className="md:col-start-5 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                <Filter className="size-4" />
                Apply
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-2">
            {filteredRuns.map((run) => (
              <Link
                key={run.fileName}
                href={queryString({ flow, status, model, q: query, slow: slowOnly ? "true" : undefined, run: run.runId })}
                className={cn(
                  "block rounded-lg border bg-background p-3 transition hover:bg-muted/40",
                  selectedRun?.fileName === run.fileName && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{flowLabel(run.flow)}</div>
                    <div className="truncate text-xs text-muted-foreground">{run.fileName}</div>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", statusClass(run.status))}>
                    {run.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(run.startedAt)}</span>
                  <span>{run.model ?? "no model"}</span>
                  <span>{run.items.length} items</span>
                </div>
                {run.anomalies.length ? (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="size-3" />
                    {run.anomalies.length} anomaly highlights
                  </div>
                ) : null}
              </Link>
            ))}
          </aside>

          <section className="min-w-0">
            {selectedRun ? (
              <div className="space-y-4">
                <Card className="rounded-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-xl">{selectedRun.fileName}</CardTitle>
                        <CardDescription className="mt-2">
                          {selectedRun.runId} · {flowLabel(selectedRun.flow)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={cn("capitalize", statusClass(selectedRun.status))}>
                        {selectedRun.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 px-6 md:grid-cols-5">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Model</div>
                      <div className="mt-1 truncate text-sm font-medium">{selectedRun.model ?? "n/a"}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Gauge className="size-3" />
                        Avg latency
                      </div>
                      <div className="mt-1 text-sm font-medium">{formatMs(selectedRun.latency.averageMs)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        Started
                      </div>
                      <div className="mt-1 text-sm font-medium">{formatDate(selectedRun.startedAt)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Anomalies</div>
                      <div className="mt-1 text-sm font-medium">{selectedRun.anomalies.length}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Total tokens</div>
                      <div className="mt-1 text-sm font-medium">{formatTokens(totalRunTokens(selectedRun))}</div>
                    </div>
                  </CardContent>
                </Card>

                {selectedRun.anomalies.length ? (
                  <Card className="rounded-lg border-amber-200 bg-amber-50/60">
                    <CardHeader>
                      <CardTitle className="text-base">Anomaly Summary</CardTitle>
                      <CardDescription>Review these first. They are heuristic highlights, not automatic failures.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 px-6">
                      {selectedRun.anomalies.slice(0, 12).map((anomaly) => (
                        <div key={`${anomaly.code}-${anomaly.message}`} className="flex gap-2 rounded-md bg-background/70 p-2 text-sm">
                          <Badge variant="outline" className={severityClass(anomaly.severity)}>
                            {anomaly.severity}
                          </Badge>
                          <span>{anomaly.message}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                <div className="space-y-3">
                  {reviewItems.map((item) => (
                    <ItemDetail key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>No reports found</CardTitle>
                  <CardDescription>Run an AI eval to generate JSON files in `.ai-eval-results`.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
