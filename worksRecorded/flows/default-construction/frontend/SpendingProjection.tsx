"use client";

import { useMemo } from "react";
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
import { spendingForecastPoints } from "../lib/spending-forecast";

const money = (value: number) =>
	new Intl.NumberFormat("lv-LV", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0,
	}).format(value);
const date = (value: string) =>
	new Intl.DateTimeFormat("lv-LV", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${value}T12:00:00Z`));
const percent = (value: number) =>
	new Intl.NumberFormat("lv-LV", {
		style: "percent",
		maximumFractionDigits: 1,
	}).format(value);

export function SpendingProjection({
	data,
	asOf,
}: {
	data: Forma2ClientCosts;
	asOf: string;
}) {
	const { forecast, points } = useMemo(
		() => spendingForecastPoints(data, asOf),
		[data, asOf],
	);
	const chartPoints = useMemo(
		() =>
			points.map((point) => ({
				...point,
				time: Date.parse(`${point.date}T12:00:00Z`),
			})),
		[points],
	);
	const gap =
		forecast.finalCost == null
			? null
			: forecast.contractValue - forecast.finalCost;
	return (
		<section className="rounded-xl border bg-card">
			<div className="flex flex-wrap justify-between gap-3 border-b px-6 py-5">
				<div>
					<h2 className="text-lg font-semibold">
						Projekta beigu izmaksu prognoze
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Viss projekts · dati līdz {date(asOf)} · ar piedāvāto materiālu
						piesaisti
					</p>
				</div>
				<span className="h-fit rounded-full bg-muted px-3 py-1.5 text-xs">
					Aprēķina scenārijs
				</span>
			</div>
			<div className="grid gap-6 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4">
				<div>
					<p className="text-xs text-muted-foreground">
						Prognozētās gala izmaksas
					</p>
					<p className="mt-2 text-3xl font-semibold tabular-nums">
						{forecast.finalCost == null
							? "Nepietiek datu"
							: money(forecast.finalCost)}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						{money(forecast.actual)} jau uzskaitīti
						{forecast.remainingCost == null
							? ""
							: ` + ${money(forecast.remainingCost)} vēl paredzēti`}
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">
						Starpība pret līguma summu
					</p>
					<p
						className={`mt-2 text-2xl font-semibold tabular-nums ${gap != null && gap < 0 ? "text-destructive" : gap != null && gap > 0 ? "text-green-700 dark:text-green-400" : ""}`}
					>
						{gap == null ? "—" : `${gap >= 0 ? "+" : ""}${money(gap)}`}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Līguma summa {money(forecast.contractValue)}. Starpība nav peļņas
						aprēķins.
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Izmērītā izpilde</p>
					<p className="mt-2 text-2xl font-semibold tabular-nums">
						{forecast.progress == null ? "—" : percent(forecast.progress)}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Pēc rasējumu m², svērti ar līguma pozīciju vērtībām.
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">
						Datums pie kopējā izpildes tempa
					</p>
					<p className="mt-2 text-2xl font-semibold tabular-nums">
						{forecast.finishDate ? date(forecast.finishDate) : "Nav nosakāms"}
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Kopējais 28 dienu temps. Atsevišķu darbu kavējumi nav ietverti;
						skatiet darbu prognozes zemāk.
					</p>
				</div>
			</div>
			<p className="px-6 pb-5 text-xs text-muted-foreground">
				Aplēse pie līdzšinējās izmaksu attiecības. {forecast.unknownCostRecords}{" "}
				avotiem trūkst izmaksu; materiālu krājumi nav uzskaitīti. Jauni papildu
				darbi nav ietverti.
			</p>
			<div
				className="h-[280px] px-4 sm:px-6"
				role="img"
				aria-label={`Projekta kopējo izmaksu prognoze: ${forecast.finalCost == null ? "nepietiek datu" : money(forecast.finalCost)}`}
			>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartPoints}
						margin={{ top: 24, right: 24, bottom: 22 }}
						accessibilityLayer
					>
						<CartesianGrid vertical={false} stroke="var(--border)" />
						<XAxis
							dataKey="time"
							type="number"
							domain={["dataMin", "dataMax"]}
							tickFormatter={(value) =>
								date(new Date(Number(value)).toISOString().slice(0, 10)).slice(
									0,
									6,
								)
							}
							minTickGap={50}
							tick={{ fontSize: 11 }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							width={65}
							tickFormatter={(value) => `${Number(value) / 1000} tūkst.`}
							tick={{ fontSize: 11 }}
							tickLine={false}
							axisLine={false}
						/>
						<Tooltip
							labelFormatter={(value) =>
								date(new Date(Number(value)).toISOString().slice(0, 10))
							}
							formatter={(value, name) => [money(Number(value)), name]}
							contentStyle={{
								background: "var(--popover)",
								border: "1px solid var(--border)",
								borderRadius: 10,
							}}
						/>
						<ReferenceLine
							y={forecast.contractValue}
							ifOverflow="extendDomain"
							stroke="var(--muted-foreground)"
							strokeDasharray="3 5"
							label={{
								value: "Līguma summa",
								position: "insideTopLeft",
								fill: "var(--muted-foreground)",
								fontSize: 11,
							}}
						/>
						<ReferenceLine
							x={Date.parse(`${asOf}T12:00:00Z`)}
							stroke="var(--border)"
							label={{
								value: "Prognozes sākums",
								position: "insideBottomRight",
								fill: "var(--muted-foreground)",
								fontSize: 11,
							}}
						/>
						<Line
							dataKey="actual"
							name="Uzskaitītās izmaksas"
							stroke="var(--foreground)"
							strokeWidth={2.5}
							dot={false}
							isAnimationActive={false}
						/>
						<Line
							dataKey="forecast"
							name="Prognozētās izmaksas"
							stroke="var(--primary)"
							strokeWidth={2.5}
							strokeDasharray="7 5"
							dot={false}
							isAnimationActive={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<div className="flex flex-wrap gap-5 px-6 pt-1 text-xs">
				<span>━━ Uzskaitītās izmaksas</span>
				<span className="text-primary">
					┄┄ Prognoze pēc pašreizējās izmaksu attiecības
				</span>
			</div>
			<details className="mx-6 mb-5 mt-5 border-t pt-4 text-xs text-muted-foreground">
				<summary className="cursor-pointer font-medium text-foreground">
					Kā iegūta prognoze un ko tā vēl neietver
				</summary>
				<div className="mt-3 space-y-2 leading-relaxed">
					<p>
						Atlikušais darbu apjoms tiek vērtēts pēc katras līguma pozīcijas
						izmērītajiem m². Pārsniegums virs pozīcijas līguma apjoma
						nepalielina izpildes procentu virs 100%. Pozīcijas bez izmērīta
						daudzuma paliek neizpildītajā daļā.
					</p>
					<p>
						Atlikušās izmaksas = atlikusī līguma darbu vērtība × līdzšinējās
						līguma darbu izmaksas / izmērītās izpildes līguma vērtība. Šobrīd: (
						{money(forecast.contractValue)} − {money(forecast.earned)}) ×{" "}
						{money(forecast.contractActual)} / {money(forecast.earned)}.
					</p>
					<p>
						Jau uzskaitītās papildu un nepiesaistītās izmaksas (
						{money(forecast.otherActual)}) gala summā iekļautas vienu reizi.
						Jauni papildu darbi, cenu maiņas un neuzskaitītas izmaksas nav
						prognozētas.
					</p>
					<p>
						Materiāli uzskaitīti pēc rēķiniem. Krājumi un materiālu atlikumi nav
						zināmi: iepriekš iepirkti materiāli var paaugstināt prognozi.{" "}
						{forecast.unknownCostRecords} avotiem izmaksas nav norādītas; pēc to
						papildināšanas prognoze mainīsies.
					</p>
					<p>
						Pēdējās 28 dienās izmērītās izpildes līguma vērtība pieaugusi par{" "}
						{money(forecast.recentEarned)}. Tas nosaka aplēsto datumu. Grafika
						filtri zemāk neietekmē visa projekta prognozi.
					</p>
					{forecast.unmeasuredContractValue > 0 ? (
						<p>
							Vēl {money(forecast.unmeasuredContractValue)} līguma pozīcijām nav
							izmantojama plānotā daudzuma; to izpilde nav apstiprināta.
						</p>
					) : null}
				</div>
			</details>
		</section>
	);
}
