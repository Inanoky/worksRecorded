"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type BeginDay,
  parseBeginSnapshot,
  summarizeBeginEntries,
} from "@/lib/begin-hours";
import {
  getBeginHours,
  importBeginHours,
} from "@/server/actions/begin-hours-actions";

const money = (cents: number, currencyDisplay: "symbol" | "code" = "symbol") =>
  new Intl.NumberFormat("lv-LV", {
    style: "currency",
    currency: "EUR",
    currencyDisplay,
  }).format(cents / 100);
const hours = (minutes: number) =>
  `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, "0")}m` : ""}`;
const labels = {
  approved: "Apstiprināts Begin",
  unapproved: "Neapstiprināts Begin",
  "missing-end": "Trūkst beigu laika",
  ongoing: "Darbs turpinās",
};

export function useBeginHours(siteId: string | null, refresh: unknown) {
  const [state, setState] = useState<{
    siteId: string | null;
    enabled: boolean;
    days: BeginDay[];
    diaryDates: string[];
    error: string;
  }>({ siteId: null, enabled: false, days: [], diaryDates: [], error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void revision;
    void refresh;
    if (!siteId) return;
    getBeginHours(siteId)
      .then((result) => {
        if (!cancelled) setState({ siteId, ...result, error: "" });
      })
      .catch(() => {
        if (!cancelled)
          setState({
            siteId,
            enabled: false,
            days: [],
            diaryDates: [],
            error: "Neizdevās ielādēt Begin stundu datus.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, revision, refresh]);
  return {
    ...(state.siteId === siteId
      ? state
      : {
          enabled: false,
          days: [] as BeginDay[],
          diaryDates: [] as string[],
          error: "",
        }),
    reload: () => setRevision((value) => value + 1),
  };
}

export function BeginHoursCost({ day }: { day?: BeginDay }) {
  const [open, setOpen] = useState(false);
  const summary = summarizeBeginEntries(day?.entries ?? [], day?.rateCents);
  const hasEntries = Boolean(day?.entries.length);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted underline-offset-4"
        >
          Stundas izmaksas:{" "}
          {hasEntries
            ? day?.entries.every((entry) => entry.minutes === null)
              ? "—"
              : `${hours(summary.minutes)}, ${money(summary.costCents, "code")}`
            : "Nav stundu datu"}
          {summary.missing + summary.ongoing > 0 ? " (nepilnīgi)" : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,440px)] max-h-[65vh] overflow-y-auto">
        <div className="space-y-3 text-sm">
          <p className="font-medium">
            Stundas dati · {day?.date ?? "Nav importa"}
          </p>
          {hasEntries ? (
            <p>
              {hours(summary.minutes)} × {money(day?.rateCents ?? 1250)}/h ={" "}
              {money(summary.costCents)}
              {summary.missing + summary.ongoing > 0
                ? " (tikai noslēgtie ieraksti)"
                : ""}
            </p>
          ) : (
            <p>Šai dienai nav reģistrētu Begin stundu.</p>
          )}
          {day?.entries.map((entry, index) => (
            <div
              key={`${entry.worker}-${entry.start}-${index}`}
              className="border-t pt-2"
            >
              <p className="font-medium">
                {entry.worker} ·{" "}
                {entry.minutes === null ? "—" : hours(entry.minutes)}
              </p>
              <p>
                {entry.start}–{entry.end === "Ongoing" ? "turpinās" : entry.end}{" "}
                · {labels[entry.status]}
              </p>
              <p className="text-muted-foreground">{entry.object}</p>
              {entry.comment ? (
                <p className="whitespace-pre-wrap break-words">
                  {entry.comment}
                </p>
              ) : null}
            </div>
          ))}
          {day ? (
            <p className="text-xs text-muted-foreground">
              {day.sourceCompany} · imports{" "}
              {new Date(day.importedAt).toLocaleString("lv-LV", {
                timeZone: "Europe/Riga",
              })}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BeginHoursImport({
  siteId,
  onSaved,
}: {
  siteId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileId = useId();
  const [objects, setObjects] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof importBeginHours>
  > | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(save: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await importBeginHours({
        siteId,
        snapshot: text,
        objects,
        ...(save && preview ? { expectedRevision: preview.revision } : {}),
      });
      if (result.saved) {
        onSaved();
        setOpen(false);
        setPreview(null);
      } else setPreview(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Imports neizdevās.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Importēt Stundas datus</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stundas dati no Begin</DialogTitle>
          <DialogDescription>
            Izvēlieties analizēto Begin datu failu un šim projektam atbilstošos
            objektus. Imports aizstāj šī perioda iepriekšējo momentuzņēmumu,
            saglabājot vēsturi.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={fileId} className="space-y-2">
          Begin datu fails
          <Input
            id={fileId}
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              setPreview(null);
              setObjects([]);
              setAvailable([]);
              setText("");
              setError("");
              if (!file) return;
              try {
                if (file.size > 1_000_000)
                  throw new Error("Fails pārsniedz 1 MB.");
                const value = await file.text();
                const parsed = parseBeginSnapshot(value);
                setText(value);
                setAvailable([...new Set(parsed.objects.filter(Boolean))]);
                setCompany(parsed.company);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Nederīgs fails.",
                );
              }
            }}
          />
        </label>
        {available.length ? (
          <fieldset disabled={busy} className="space-y-2">
            <legend className="mb-2 font-medium">
              {company} · šī projekta Begin objekti
            </legend>
            {available.map((object) => (
              <label key={object} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={objects.includes(object)}
                  onChange={(event) => {
                    setObjects((previous) =>
                      event.target.checked
                        ? [...previous, object]
                        : previous.filter((value) => value !== object),
                    );
                    setPreview(null);
                  }}
                />
                {object}
              </label>
            ))}
          </fieldset>
        ) : null}
        {preview ? (
          <div className="space-y-1 text-sm" aria-live="polite">
            <p>
              {preview.company} · {preview.from}–{preview.through}
            </p>
            <p>
              {preview.entries} ieraksti · {hours(preview.minutes)}
            </p>
            <p>
              Iepriekš: {hours(preview.previousMinutes)} · mainīsies{" "}
              {preview.changedDays} dienas
            </p>
            <p>
              Bez objekta: {preview.unmappedEntries} ieraksti paliek ārpus šī
              importa.
            </p>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          disabled={busy || !objects.length || !text}
          onClick={() => submit(Boolean(preview))}
        >
          {busy
            ? "Apstrādā…"
            : preview
              ? "Apstiprināt un saglabāt"
              : "Pārbaudīt importu"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
