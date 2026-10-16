"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useFimaWarehouseAvailability } from "./FimaWarehouseProvider";

const quantity = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 3 });

export function FimaWarehouse({
	siteId,
	connected,
	children,
}: {
	siteId: string;
	connected: boolean;
	children: ReactNode;
}) {
	const [tab, setTab] = useState<"bis" | "received">("bis");
	const { rows, loading, error, loadedAt, refresh } =
		useFimaWarehouseAvailability(siteId, connected);
	const [search, setSearch] = useState("");
	const visible = rows.filter((row) =>
		row.label
			.toLocaleLowerCase("lv")
			.includes(search.trim().toLocaleLowerCase("lv")),
	);
	return (
		<section className="space-y-4">
			<fieldset className="flex flex-wrap gap-2" aria-label="Noliktavas skats">
				<Button
					variant={tab === "bis" ? "default" : "outline"}
					aria-pressed={tab === "bis"}
					onClick={() => setTab("bis")}
				>
					Pieejams BIS
				</Button>
				<Button
					variant={tab === "received" ? "default" : "outline"}
					aria-pressed={tab === "received"}
					onClick={() => setTab("received")}
				>
					Saņemtie materiāli un rēķini
				</Button>
			</fieldset>
			{tab === "bis" ? (
				<div className="space-y-4 rounded-xl border p-4 sm:p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 className="font-semibold">Pieejamie materiāli BIS</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Apstiprināti saņemtie materiāli, atskaitot BIS norādīto
								izlietojumu.
							</p>
							{loadedAt ? (
								<p className="mt-1 text-xs text-muted-foreground">
									Atjaunots: {new Date(loadedAt).toLocaleString("lv-LV")}
								</p>
							) : null}
						</div>
						<Button
							variant="outline"
							disabled={!connected || loading}
							onClick={() => void refresh()}
						>
							{loading ? "Ielādē..." : "Atjaunot no BIS"}
						</Button>
					</div>
					{!connected ? (
						<output>
							Projektam nav aktīva BIS savienojuma. Pievienojiet BIS lietu un
							atjaunojiet piekļuvi.
						</output>
					) : null}
					{error ? (
						<p
							role="alert"
							className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
						>
							{error}
							{loadedAt ? " Tiek rādīti iepriekš ielādētie dati." : ""}
						</p>
					) : null}
					<Input
						aria-label="Meklēt BIS materiālu"
						placeholder="Meklēt pēc materiāla nosaukuma vai koda..."
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					<div className="overflow-hidden rounded-lg border">
						<Table className="table-fixed [&_td]:whitespace-normal [&_td]:break-words [&_th]:whitespace-normal">
							<colgroup>
								<col style={{ width: "52%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "12%" }} />
							</colgroup>
							<TableHeader className="bg-muted/40">
								<TableRow>
									<TableHead>Materiāls</TableHead>
									<TableHead>Mērvienība</TableHead>
									<TableHead className="text-right">Saņemts</TableHead>
									<TableHead className="text-right">Izlietots</TableHead>
									<TableHead className="text-right">Pieejams</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visible.map((row) => (
									<TableRow key={row.id} className="even:bg-muted/20">
										<TableCell className="py-3">{row.label}</TableCell>
										<TableCell>{row.measurementUnit}</TableCell>
										<TableCell className="text-right tabular-nums">
											{quantity.format(row.deliveredQuantity)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{quantity.format(row.usedQuantity)}
										</TableCell>
										<TableCell className="text-right font-semibold tabular-nums text-green-700">
											{quantity.format(row.availableQuantity)}
										</TableCell>
									</TableRow>
								))}
								{!visible.length ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="py-8 text-center text-muted-foreground"
										>
											{loading
												? "Ielādē BIS materiālus..."
												: error || !connected
													? "BIS dati nav ielādēti."
													: loadedAt
														? search
															? "Atbilstoši materiāli nav atrasti."
															: "BIS nav pieejamu materiālu ar pozitīvu atlikumu."
														: "Gatavo BIS materiālu sarakstu..."}
										</TableCell>
									</TableRow>
								) : null}
							</TableBody>
						</Table>
					</div>
				</div>
			) : (
				children
			)}
		</section>
	);
}
