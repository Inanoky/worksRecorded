"use client";

import Link from "next/link";
import {
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	MATERIAL_LABELS,
	type MaterialObservation,
	materialDate,
	summarizeMaterialConsumption,
} from "@/lib/material-consumption/model";
import { getMaterialConsumption } from "@/server/actions/material-consumption";

type Data = Awaited<ReturnType<typeof getMaterialConsumption>>;
const number = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 3 });
const dateLabel = (date: string) => date.split("-").reverse().join(".");
const kindLabels = {
	consumed: "Izlietots",
	delivered: "Piegāde / saņemts",
	balance: "Atlikums",
	returned: "Atgriezts",
};
const selectClass =
	"h-9 min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600";

function exportableConsumption(entry: MaterialObservation) {
	return (
		entry.status === "reported" &&
		entry.kind === "consumed" &&
		entry.material !== "unknown" &&
		entry.bags !== null
	);
}

export function materialConsumptionCsv(
	entries: MaterialObservation[],
	projects: Data["projects"],
) {
	const cell = (value: unknown) => {
		let text = String(value ?? "");
		if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
		return `"${text.replace(/"/g, '""')}"`;
	};
	return (
		"\ufeff" +
		[
			["Projekts", "Tips", "Daudzums (maisi)", "Datums"],
			...entries
				.filter(exportableConsumption)
				.map((entry) => [
					projects.find((project) => project.id === entry.siteId)?.name,
					entry.material === "cement" ? "cement" : "thermowhite",
					String(entry.bags).replace(".", ","),
					dateLabel(entry.date),
				]),
		]
			.map((row) => row.map(cell).join(";"))
			.join("\r\n")
	);
}

export function MaterialConsumptionPage({
	initialData,
}: {
	initialData: Data;
}) {
	const [data, setData] = useState(initialData);
	const formId = useId();
	const detailRef = useRef<HTMLElement>(null);
	const [projectId, setProjectId] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [period, setPeriod] = useState("all");
	const [selected, setSelected] = useState<string | null>(null);
	const [reviewOnly, setReviewOnly] = useState(false);
	const [detailKind, setDetailKind] = useState("all");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const invalidRange = Boolean(from && to && from > to);
	const projectOptions = useMemo(
		() => [...data.projects].sort((a, b) => a.name.localeCompare(b.name, "lv")),
		[data.projects],
	);
	const filtered = useMemo(
		() =>
			data.entries.filter(
				(entry) =>
					!invalidRange &&
					(!from || entry.date >= from) &&
					(!to || entry.date <= to) &&
					(!projectId || entry.siteId === projectId),
			),
		[data.entries, from, to, projectId, invalidRange],
	);
	const projects = useMemo(
		() =>
			summarizeMaterialConsumption(data.projects, filtered)
				.filter(
					(project) =>
						project.reportCount > 0 && (!reviewOnly || project.reviewCount > 0),
				)
				.sort((a, b) => a.name.localeCompare(b.name, "lv")),
		[data.projects, filtered, reviewOnly],
	);
	const total = summarizeMaterialConsumption(
		[{ id: "all", name: "all" }],
		filtered.map((entry) => ({ ...entry, siteId: "all" })),
	)[0];
	const selectedProject = data.projects.find(
		(project) => project.id === selected,
	);
	const details = filtered.filter(
		(entry) =>
			entry.siteId === selected &&
			(!reviewOnly || entry.status === "needs_review") &&
			(detailKind === "all" || entry.kind === detailKind),
	);
	const exportEntries = filtered.filter(
		(entry) =>
			!reviewOnly &&
			(!selected || entry.siteId === selected) &&
			exportableConsumption(entry),
	);
	useEffect(() => {
		if (!selected) return;
		detailRef.current?.scrollIntoView?.({
			block: "start",
			behavior: "instant",
		});
		detailRef.current?.focus({ preventScroll: true });
	}, [selected]);

	function changePeriod(value: string) {
		setPeriod(value);
		const today = materialDate(new Date());
		if (!today) return;
		const calendar = new Date(`${today}T12:00:00Z`);
		if (value === "all") {
			setFrom("");
			setTo("");
		}
		if (value === "month") {
			setFrom(`${today.slice(0, 7)}-01`);
			setTo(today);
		}
		if (value === "week") {
			calendar.setUTCDate(
				calendar.getUTCDate() - ((calendar.getUTCDay() + 6) % 7),
			);
			setFrom(calendar.toISOString().slice(0, 10));
			setTo(today);
		}
		if (value === "today") {
			setFrom(today);
			setTo(today);
		}
	}

	function refresh() {
		setError(null);
		startTransition(async () => {
			try {
				setData(await getMaterialConsumption());
			} catch {
				setError("Neizdevās atjaunot materiālu pārskatu. Mēģiniet vēlreiz.");
			}
		});
	}

	function download() {
		const url = URL.createObjectURL(
			new Blob([materialConsumptionCsv(exportEntries, data.projects)], {
				type: "text/csv;charset=utf-8",
			}),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "materialu-paterins.csv";
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	return (
		<main
			className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6"
			aria-labelledby={`${formId}-title`}
		>
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1
						id={`${formId}-title`}
						className="text-3xl font-semibold tracking-tight"
					>
						Materiālu patēriņš
					</h1>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={refresh}
						disabled={pending}
					>
						{pending ? "Atjauno…" : "Atjaunot"}
					</Button>
					<Button
						size="sm"
						onClick={download}
						disabled={exportEntries.length === 0}
					>
						Eksportēt CSV
					</Button>
				</div>
			</header>
			{error && (
				<p
					role="alert"
					className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
				>
					{error}
				</p>
			)}
			<section
				className="grid gap-4 sm:grid-cols-3"
				aria-label="Perioda kopsavilkums"
			>
				<div className="rounded-lg border bg-background p-4">
					<p className="text-sm font-medium text-muted-foreground">
						ThermoWhite līme
					</p>
					<p className="mt-2 text-3xl font-semibold tabular-nums">
						{number.format(total.thermowhiteBags)}{" "}
						<span className="text-sm font-normal text-muted-foreground">
							maisi
						</span>
					</p>
				</div>
				<div className="rounded-lg border bg-background p-4">
					<p className="text-sm font-medium text-muted-foreground">Cements</p>
					<p className="mt-2 text-3xl font-semibold tabular-nums">
						{number.format(total.cementBags)}{" "}
						<span className="text-sm font-normal text-muted-foreground">
							maisi
						</span>
					</p>
				</div>
				<button
					type="button"
					onClick={() => setReviewOnly(!reviewOnly)}
					aria-pressed={reviewOnly}
					className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
				>
					<p className="text-sm font-medium text-muted-foreground">
						Jāpārbauda
					</p>
					<p className="mt-2 text-3xl font-semibold tabular-nums">
						{total.reviewCount}
					</p>
				</button>
			</section>
			<section
				aria-label="Filtri"
				className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-4"
			>
				<label
					htmlFor={`${formId}-project`}
					className="min-w-0 flex-1 space-y-2 text-sm font-medium"
				>
					Projekts
					<select
						id={`${formId}-project`}
						value={projectId}
						onChange={(event) => {
							setProjectId(event.target.value);
							setSelected(null);
							setDetailKind("all");
						}}
						className={`${selectClass} mt-2 w-full min-w-40`}
					>
						<option value="">Visi projekti</option>
						{projectOptions.map((project) => (
							<option key={project.id} value={project.id}>
								{project.name}
							</option>
						))}
					</select>
				</label>
				<label
					htmlFor={`${formId}-period`}
					className="flex flex-col gap-2 text-sm font-medium"
				>
					Periods
					<select
						id={`${formId}-period`}
						aria-label="Periods"
						className={selectClass}
						value={period}
						onChange={(event) => changePeriod(event.target.value)}
					>
						<option value="all">Viss periods</option>
						<option value="today">Šodien</option>
						<option value="week">Šī nedēļa</option>
						<option value="month">Šis mēnesis</option>
						<option value="custom">Izvēlēts periods</option>
					</select>
				</label>
				<label
					htmlFor={`${formId}-from`}
					className="flex flex-col gap-2 text-sm font-medium"
				>
					No
					<Input
						id={`${formId}-from`}
						aria-label="No datuma"
						type="date"
						value={from}
						max={to || undefined}
						onChange={(event) => {
							setPeriod("custom");
							setFrom(event.target.value);
						}}
						className="w-40"
					/>
				</label>
				<label
					htmlFor={`${formId}-to`}
					className="flex flex-col gap-2 text-sm font-medium"
				>
					Līdz
					<Input
						id={`${formId}-to`}
						aria-label="Līdz datumam"
						type="date"
						value={to}
						min={from || undefined}
						onChange={(event) => {
							setPeriod("custom");
							setTo(event.target.value);
						}}
						className="w-40"
					/>
				</label>
				{invalidRange && (
					<p className="w-full text-sm text-red-700" role="alert">
						Sākuma datumam jābūt pirms beigu datuma.
					</p>
				)}
			</section>
			<section
				className="overflow-hidden rounded-lg border bg-background"
				aria-label="Patēriņš pa projektiem"
			>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<caption className="sr-only">
							Ziņojumos norādītais izlietojums maisos katram projektam
						</caption>
						<thead className="bg-muted/40 text-muted-foreground">
							<tr>
								<th className="p-4 font-medium">Projekts</th>
								<th className="p-4 text-right font-medium">ThermoWhite līme</th>
								<th className="p-4 text-right font-medium">Cements</th>
								<th className="p-4 text-right font-medium">Jāpārbauda</th>
							</tr>
						</thead>
						<tbody>
							{projects.map((project) => (
								<tr
									key={project.id}
									className={
										selected === project.id
											? "border-t bg-green-50/70 dark:bg-green-950/30"
											: "border-t hover:bg-muted/30"
									}
								>
									<td className="p-4">
										<button
											type="button"
											className="text-left font-medium text-green-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 dark:text-green-300"
											onClick={() => {
												setSelected(project.id);
												setDetailKind("all");
											}}
										>
											{project.name}
										</button>
									</td>
									<td className="p-4 text-right tabular-nums">
										{number.format(project.thermowhiteBags)}
									</td>
									<td className="p-4 text-right tabular-nums">
										{number.format(project.cementBags)}
									</td>
									<td className="p-4 text-right tabular-nums">
										{project.reviewCount ? (
											<span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
												{project.reviewCount}
											</span>
										) : (
											"—"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{projects.length === 0 && (
					<div className="space-y-2 p-6 text-center">
						<p className="font-medium">Šajā atlasē nav materiālu ziņojumu.</p>
					</div>
				)}
			</section>
			{selectedProject && (
				<section
					ref={detailRef}
					tabIndex={-1}
					className="space-y-4 rounded-lg border bg-background p-4 sm:p-6"
					aria-label="Projekta ziņojumi"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold">{selectedProject.name}</h2>
							{!(
								"historical" in selectedProject && selectedProject.historical
							) && (
								<Link
									className="text-sm text-green-800 underline dark:text-green-300"
									href={`/dashboard/sites/${selectedProject.id}/dashboard`}
								>
									Atvērt būvdarbu žurnālu
								</Link>
							)}
						</div>
						<Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
							Aizvērt
						</Button>
					</div>
					<label className="flex flex-wrap items-center gap-3 text-sm font-medium">
						Ziņojumu veids
						<select
							aria-label="Ziņojumu veids"
							className={selectClass}
							value={detailKind}
							onChange={(event) => setDetailKind(event.target.value)}
						>
							<option value="all">Visi veidi</option>
							{Object.entries(kindLabels).map(([value, label]) => (
								<option value={value} key={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					<div className="space-y-3">
						{details.map((entry) => (
							<article key={entry.id} className="rounded-md border p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-medium">
											{dateLabel(entry.date)} ·{" "}
											{MATERIAL_LABELS[entry.material]}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{kindLabels[entry.kind]}
											{entry.reporter ? ` · ${entry.reporter}` : ""}
											{entry.location ? ` · ${entry.location}` : ""}
										</p>
									</div>
									<p className="text-lg font-semibold tabular-nums">
										{entry.bags == null
											? "Nav norādīts"
											: `${number.format(entry.bags)} maisi`}
									</p>
								</div>
								{entry.status === "needs_review" && (
									<p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
										Jāpārbauda: {entry.reason}
									</p>
								)}
								<details className="mt-3 text-sm">
									<summary className="cursor-pointer font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
										Oriģinālais ziņojums
										{entry.photos.length
											? ` un attēli (${entry.photos.length})`
											: ""}
									</summary>
									<p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3">
										{entry.originalText}
									</p>
									{entry.photos.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-3">
											{entry.photos
												.filter((url) => /^https:\/\//.test(url))
												.map((url, index) => (
													<a
														href={url}
														key={url}
														target="_blank"
														rel="noreferrer"
														className="text-green-800 underline dark:text-green-300"
													>
														Attēls {index + 1}
													</a>
												))}
										</div>
									)}
								</details>
							</article>
						))}
						{details.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Izvēlētajam veidam nav ziņojumu.
							</p>
						)}
					</div>
				</section>
			)}
		</main>
	);
}
