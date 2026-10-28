"use client";

import { Fragment, useMemo, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { Forma2ClientCosts } from "../lib/forma2-client-costs";
import type { SpendingWorkGroup } from "../lib/spending-timeline";
import { workProgress } from "../lib/work-progress";

const number = (value: number, digits = 1) =>
	new Intl.NumberFormat("lv-LV", { maximumFractionDigits: digits }).format(
		value,
	);
const date = (value: string) =>
	new Intl.DateTimeFormat("lv-LV", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${value}T12:00:00Z`));

export function WorkCompletion({
	data,
	workGroups,
	positionGroups,
	asOf,
	from,
	sectionId,
	workId,
}: {
	data: Forma2ClientCosts;
	workGroups: SpendingWorkGroup[];
	positionGroups: Record<string, string>;
	asOf: string;
	from: string;
	sectionId: string;
	workId: string;
}) {
	const [metric, setMetric] = useState<"area" | "percent">("area");
	const [focus, setFocus] = useState("");
	const progress = useMemo(
		() => workProgress(data, workGroups, positionGroups, asOf, sectionId),
		[data, workGroups, positionGroups, asOf, sectionId],
	);
	const summaries = progress.summaries.filter(
		(group) => !workId || group.id === workId,
	);
	const activeFocus = summaries.some((group) => group.id === focus)
		? focus
		: "";
	const visible = summaries.filter(
		(group) => !activeFocus || group.id === activeFocus,
	);
	const last = visible.reduce(
		(end, group) =>
			group.finishDate && group.finishDate > end ? group.finishDate : end,
		asOf,
	);
	const points = progress.points.filter(
		(point) => point.date >= from && point.date <= last,
	);
	const unit = metric === "area" ? "m²" : "%";
	return (
		<section className="rounded-xl border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
				<div>
					<h2 className="font-semibold">
						Paveikto darbu apjoms un pabeigšanas prognoze
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Izmērītie rasējumu m² · uzkrājums no darbu sākuma līdz {date(asOf)}
					</p>
				</div>
				<div className="flex rounded-lg bg-muted p-1">
					{(
						[
							{ id: "area", label: "m²" },
							{ id: "percent", label: "%" },
						] as const
					).map((item) => (
						<button
							type="button"
							key={item.id}
							aria-pressed={metric === item.id}
							onClick={() => setMetric(item.id)}
							className={`rounded-md px-4 py-1.5 text-xs ${metric === item.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
			{summaries.length ? (
				<>
					<div className="flex flex-wrap items-center gap-2 px-6 pt-5">
						<button
							type="button"
							onClick={() => setFocus("")}
							aria-pressed={!activeFocus}
							className={`rounded-full border px-3 py-1.5 text-xs ${!activeFocus ? "bg-muted font-medium" : ""}`}
						>
							Visi darbi
						</button>
						{summaries.map((group) => (
							<button
								type="button"
								key={group.id}
								onClick={() =>
									setFocus((current) => (current === group.id ? "" : group.id))
								}
								aria-pressed={activeFocus === group.id}
								className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${activeFocus && activeFocus !== group.id ? "opacity-40" : ""}`}
							>
								<span
									className="size-2.5 rounded-full"
									style={{ background: group.color }}
								/>
								{group.label}
							</button>
						))}
					</div>
					<div
						className="h-[330px] px-3 pt-5 sm:px-6"
						role="img"
						aria-label={`Paveiktie darbi ${unit} ar pabeigšanas prognozi`}
					>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={points}
								margin={{ top: 15, right: 25, bottom: 22 }}
								accessibilityLayer
							>
								<CartesianGrid vertical={false} stroke="var(--border)" />
								<XAxis
									dataKey="time"
									type="number"
									domain={["dataMin", "dataMax"]}
									tickFormatter={(value) =>
										date(
											new Date(Number(value)).toISOString().slice(0, 10),
										).slice(0, 6)
									}
									minTickGap={45}
									tick={{ fontSize: 11 }}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									width={75}
									tickFormatter={(value) =>
										`${number(Number(value), 0)} ${unit}`
									}
									tick={{ fontSize: 11 }}
									tickLine={false}
									axisLine={false}
									domain={metric === "percent" ? [0, 100] : [0, "auto"]}
								/>
								<Tooltip
									labelFormatter={(value) =>
										date(new Date(Number(value)).toISOString().slice(0, 10))
									}
									formatter={(value, name) => [
										`${number(Number(value))} ${unit}`,
										name,
									]}
									contentStyle={{
										background: "var(--popover)",
										border: "1px solid var(--border)",
										borderRadius: 10,
									}}
								/>
								<ReferenceLine
									x={Date.parse(`${asOf}T12:00:00Z`)}
									stroke="var(--border)"
									label={{
										value: "Prognozes sākums",
										position: "insideBottomRight",
										fontSize: 11,
										fill: "var(--muted-foreground)",
									}}
								/>
								{metric === "percent" ? (
									<ReferenceLine
										y={100}
										stroke="var(--muted-foreground)"
										strokeDasharray="3 5"
									/>
								) : null}
								{visible.map((group) => (
									<Fragment key={group.id}>
										<Line
											dataKey={(point: (typeof points)[number]) =>
												metric === "area"
													? point.values[group.id]?.actual
													: point.values[group.id]?.percent
											}
											name={group.label}
											stroke={group.color}
											strokeWidth={2.5}
											dot={false}
											isAnimationActive={false}
										/>
										<Line
											dataKey={(point: (typeof points)[number]) =>
												metric === "area"
													? point.values[group.id]?.forecast
													: point.values[group.id]?.forecastPercent
											}
											name={`${group.label} · prognoze`}
											stroke={group.color}
											strokeWidth={2}
											strokeDasharray="6 5"
											dot={false}
											isAnimationActive={false}
										/>
									</Fragment>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
					<div className="flex flex-wrap gap-5 px-6 py-3 text-xs text-muted-foreground">
						<span className="flex items-center gap-2">
							<span className="w-7 border-t-2 border-foreground" />
							Izmērītā izpilde
						</span>
						<span className="flex items-center gap-2">
							<span className="w-7 border-t-2 border-dashed border-foreground" />
							Prognoze pēc 28 dienu tempa
						</span>
					</div>
					<div className="overflow-x-auto border-t">
						<table className="w-full text-left text-xs">
							<thead className="bg-muted/40 text-muted-foreground">
								<tr>
									<th className="px-6 py-3 font-normal">Darbs</th>
									<th className="px-3 py-3 text-right font-normal">
										Izmērīts, m²
									</th>
									<th className="px-3 py-3 text-right font-normal">
										Līgums, m²
									</th>
									<th className="px-3 py-3 text-right font-normal">Izpilde</th>
									<th className="px-3 py-3 text-right font-normal">
										Temps, m²/d.
									</th>
									<th className="px-6 py-3 text-right font-normal">
										Pabeigšanas prognoze
									</th>
								</tr>
							</thead>
							<tbody>
								{summaries.map((group) => (
									<tr key={group.id} className="border-t">
										<td className="px-6 py-3">
											<span className="flex items-center gap-2">
												<span
													className="size-2.5 shrink-0 rounded-full"
													style={{ background: group.color }}
												/>
												{group.label}
											</span>
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{number(group.actual)}
											{group.actual - group.completed > 0.05 ? (
												<span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
													Līgumā ieskaitīti {number(group.completed)} m²
												</span>
											) : null}
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{number(group.planned)}
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{number(group.progress * 100)}%
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{number(group.recentPerDay)}
										</td>
										<td className="whitespace-nowrap px-6 py-3 text-right">
											{group.daysRemaining === 0
												? "Apjoms sasniegts"
												: group.finishDate
													? date(group.finishDate)
													: "Nepietiek tempa datu"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			) : (
				<p className="px-6 py-10 text-sm text-muted-foreground">
					Izvēlētajiem darbiem nav līguma m² apjoma prognozes aprēķinam.
				</p>
			)}
			<p className="border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground">
				Katrs slānis ir atsevišķs darbu apjoms; m² starp darbiem nepieskaita
				ēkas platībai. Izpildes % un atlikums aprēķināti katrai līguma
				pozīcijai, nepārsniedzot 100%; pārsniegtie m² paliek redzami izmērītajā
				apjomā. Prognoze pieņem pēdējo 28 kalendāro dienu vidējo tempu. Nav
				mērījumu ≠ nav paveikta darba.
			</p>
		</section>
	);
}
