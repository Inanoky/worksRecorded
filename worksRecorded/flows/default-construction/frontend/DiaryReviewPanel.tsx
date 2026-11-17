"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SavedRecord = {
  id: string;
  Date: string | null;
  Works: string | null;
  Comments: string | null;
  Location: string | null;
  Units: string | null;
  Amounts: number | null;
  Comments_Custom_1: string | number | null;
  WorkersInvolved: number | null;
  TimeInvolved: number | null;
  positionId: string | null;
};
type IntakeRun = {
  id: string;
  status: string;
  recordIds: string[];
  createdAt: string;
  sourceText: string;
  reply: string;
  errorCode: string | null;
  records: SavedRecord[];
  positions: { id: string; code: string; name: string }[];
  metrics: {
    steps?: { name: string; at: string }[];
    model?: string;
    totalTokens?: number;
    durationMs?: number;
  } | null;
};
type IntakeData = { enabled: boolean; runs: IntakeRun[] };
const statuses: Record<string, string> = {
  running: "Apstrādā ziņu",
  completed: "Ieraksti saglabāti",
  failed: "Izpilde neizdevās",
  needs_clarification: "Nepieciešams precizējums",
  replied: "Atbilde sagatavota",
  interrupted: "Izpilde pārtrūkusi",
};
const steps: Record<string, string> = {
  read_context: "Ielādē projekta datus",
  read_source_message: "Lasa sākotnējo ziņu",
  read_project_context: "Lasa projekta noteikumus un darbus",
  search_forma2_positions: "Meklē Forma2 pozīcijas",
  read_forma2_position: "Pārbauda Forma2 pozīciju",
  validate_diary_draft: "Pārbauda ierakstu melnrakstu",
  validate_records: "Validē gala rezultātu",
  save_records: "Saglabā ierakstus",
  finished: "Pabeigts",
};
const display = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "Nav norādīts"
    : String(value);
const dateTime = (value: string) =>
  new Date(value).toLocaleString("lv-LV", { timeZone: "Europe/Riga" });

export function DiaryReviewPanel({ siteId }: { siteId: string }) {
  const [data, setData] = useState<IntakeData | null>(null);
  const [error, setError] = useState("");
  const endpoint = `/api/sites/${encodeURIComponent(siteId)}/diary-review`;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Neizdevās ielādēt izpildes.");
      if (!signal.aborted) {
        setData(result);
        setError("");
      }
    },
    [endpoint],
  );
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        await load(controller.signal);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Neizdevās ielādēt izpildes.",
          );
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Dienasgrāmatas AI aģents</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Nosūtiet WhatsApp ziņu no atļautā testa numura, izvēloties šo
          projektu. Aģents uzreiz nolasa ziņu un Forma2 datus, pārbauda
          rezultātu un saglabā ierakstus. Šeit redzama izpildes gaita.
          Periodiskas aģenta palaišanas nav.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!data && !error ? <output>Ielādē izpildes…</output> : null}
      {data && !data.enabled ? (
        <p>Aģenta testa režīms šim projektam nav ieslēgts.</p>
      ) : null}
      {data?.enabled && !data.runs.length ? (
        <p className="text-sm text-muted-foreground">
          Izpilžu vēl nav. Nosūtiet pirmo testa ziņu WhatsApp.
        </p>
      ) : null}
      {data?.runs.map((run) => (
        <Card key={run.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {statuses[run.status] ?? run.status}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {dateTime(run.createdAt)} · {run.recordIds.length} ieraksti
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <blockquote className="whitespace-pre-wrap border-l-2 pl-3">
              {run.sourceText}
            </blockquote>
            {run.metrics?.steps?.length ? (
              <ol
                aria-label="Aģenta izpildes soļi"
                className="space-y-1 text-sm text-muted-foreground"
              >
                {run.metrics.steps.map((step, index) => (
                  <li key={`${index}-${step.name}`}>
                    {new Date(step.at).toLocaleTimeString("lv-LV", {
                      timeZone: "Europe/Riga",
                    })}{" "}
                    · {steps[step.name] ?? step.name}
                  </li>
                ))}
              </ol>
            ) : null}
            {run.status === "running" ? (
              <output className="block text-sm">
                Apstrāde turpinās. Izpilde nav atkarīga no šīs lapas.
              </output>
            ) : null}
            {run.status === "failed" || run.status === "interrupted" ? (
              <p className="text-sm">
                Izpilde nav pabeigta. Automātiski atkārtota palaišana nenotiek.
                Pārbaudiet žurnālu pirms atkārtotas ziņas sūtīšanas.
                {run.errorCode ? ` Kods: ${run.errorCode}.` : ""}
              </p>
            ) : null}
            {run.reply ? <p className="text-sm">{run.reply}</p> : null}
            {run.records.map((record) => {
              const position = run.positions.find(
                (item) => item.id === record.positionId,
              );
              return (
                <details key={record.id} className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {record.Works || "Dienasgrāmatas ieraksts"} ·{" "}
                    {display(record.Comments_Custom_1 ?? record.Amounts)}{" "}
                    {record.Units}
                  </summary>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt>Datums</dt>
                    <dd>{record.Date?.slice(0, 10)}</dd>
                    <dt>Vieta</dt>
                    <dd>{display(record.Location)}</dd>
                    <dt>Komentārs</dt>
                    <dd>{display(record.Comments)}</dd>
                    <dt>Darbinieki</dt>
                    <dd>{display(record.WorkersInvolved)}</dd>
                    <dt>Stundas</dt>
                    <dd>{display(record.TimeInvolved)}</dd>
                    <dt>Forma2</dt>
                    <dd>
                      {position
                        ? `${position.code} ${position.name}`
                        : record.positionId || "Nav piesaistes"}
                    </dd>
                  </dl>
                </details>
              );
            })}
            {run.metrics?.model ? (
              <p className="text-xs text-muted-foreground">
                {run.metrics.model}
                {run.metrics.totalTokens !== undefined
                  ? ` · ${run.metrics.totalTokens} tokeni`
                  : ""}
                {run.metrics.durationMs !== undefined
                  ? ` · ${(run.metrics.durationMs / 1000).toFixed(1)} s`
                  : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
