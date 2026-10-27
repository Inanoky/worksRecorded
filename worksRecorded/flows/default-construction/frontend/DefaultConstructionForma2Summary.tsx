"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import {
	calculateForma2MoneyTotals,
	type Forma2ResultRow,
} from "../lib/forma2-analytics";
import {
	getForma2AnalyticsCopy,
	getForma2AnalyticsLocale,
} from "../lib/forma2-analytics-copy";
import {
	buildForma2SectionSummaries,
	forma2PositionLabel,
} from "../lib/forma2-section-summary";
import { DefaultConstructionForma2ContractEditor } from "./DefaultConstructionForma2ContractEditor";
import { DefaultConstructionForma2CostBreakdown } from "./DefaultConstructionForma2CostBreakdown";
import { DefaultConstructionForma2QuantityBreakdown } from "./DefaultConstructionForma2QuantityBreakdown";

export function DefaultConstructionForma2Summary({
	siteId,
	rows,
	organizationLanguage,
}: {
	siteId: string;
	rows: Forma2ResultRow[];
	organizationLanguage: string | null;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const locale = getForma2AnalyticsLocale(organizationLanguage);
	const currencyFormatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	});
	const quantityFormatter = new Intl.NumberFormat(locale, {
		maximumFractionDigits: 2,
	});
	const money = (amount: number) => currencyFormatter.format(amount);
	const number = (amount: number | null) =>
		amount == null ? "—" : quantityFormatter.format(amount);
	const totals = calculateForma2MoneyTotals(rows);
	const groups = buildForma2SectionSummaries(rows);
	if (!rows.length) return null;
	return (
		<section aria-label={t.overview} className="space-y-4 px-4 pb-4 sm:px-6">
			<dl className="grid gap-3 sm:grid-cols-3">
				{[
					{ label: t.planned, amount: totals.plannedTotalCost },
					{ label: t.assigned, amount: totals.actualTotalCost },
					{ label: t.remaining, amount: totals.variance },
				].map(({ label, amount }) => (
					<div key={label} className="rounded-lg border bg-muted/30 p-4">
						<dt className="text-xs text-muted-foreground">{label}</dt>
						<dd
							className={`mt-1 text-xl font-semibold tabular-nums ${amount < 0 ? "text-destructive" : ""}`}
						>
							{money(amount)}
						</dd>
					</div>
				))}
			</dl>
			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full min-w-[760px] text-sm">
					<thead className="bg-muted/40 text-xs text-muted-foreground">
						<tr>
							<th className="px-4 py-3 text-left font-medium">{t.position}</th>
							<th className="px-3 py-3 text-right font-medium">
								{t.contractQuantity}
							</th>
							<th className="px-3 py-3 text-right font-medium">
								{t.actualQuantity}
							</th>
							<th className="px-3 py-3 text-right font-medium">
								{t.plannedTotal}
							</th>
							<th className="px-3 py-3 text-right font-medium">
								{t.actualTotal}
							</th>
							<th className="px-4 py-3 text-right font-medium">
								{t.remaining}
							</th>
						</tr>
					</thead>
					<tbody>
						{groups.map((group) => {
							const open = expanded.has(group.row.id);
							return (
								<Fragment key={group.row.id}>
									<tr className="border-t bg-muted/20 font-medium">
										<th scope="row" className="px-4 py-3 text-left">
											{group.children.length ? (
												<button
													type="button"
													className="flex items-center gap-2 text-left"
													aria-expanded={open}
													onClick={() =>
														setExpanded((previous) => {
															const next = new Set(previous);
															if (open) next.delete(group.row.id);
															else next.add(group.row.id);
															return next;
														})
													}
												>
													{open ? (
														<ChevronDown className="h-4 w-4" />
													) : (
														<ChevronRight className="h-4 w-4" />
													)}
													{forma2PositionLabel(group.row)}
												</button>
											) : (
												forma2PositionLabel(group.row)
											)}
										</th>
										<td className="px-3 py-3 text-right tabular-nums">
											{group.children.length
												? "—"
												: number(group.row.plannedQuantity)}
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{group.children.length
												? "—"
												: number(group.row.actualQuantity)}
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											{money(group.totals.plannedTotalCost)}
										</td>
										<td className="px-3 py-3 text-right tabular-nums">
											<DefaultConstructionForma2CostBreakdown
												siteId={siteId}
												positionId={group.row.id}
												costType="total"
												amount={group.totals.actualTotalCost}
												organizationLanguage={organizationLanguage}
											/>
										</td>
										<td
											className={`px-4 py-3 text-right tabular-nums ${group.totals.variance < 0 ? "text-destructive" : ""}`}
										>
											{money(group.totals.variance)}
										</td>
									</tr>
									{open
										? group.children.map((row) => (
												<tr key={row.id} className="border-t">
													<th
														scope="row"
														className="max-w-sm py-3 pl-10 pr-4 text-left font-normal"
													>
														<div className="flex items-start gap-2">
															<span>{forma2PositionLabel(row)}</span>
															<DefaultConstructionForma2ContractEditor
																siteId={siteId}
																row={row}
																organizationLanguage={organizationLanguage}
															/>
														</div>
													</th>
													<td className="px-3 py-3 text-right tabular-nums">
														{number(row.plannedQuantity)}{" "}
														<span className="text-xs text-muted-foreground">
															{row.unit}
														</span>
													</td>
													<td className="px-3 py-3 text-right tabular-nums">
														<DefaultConstructionForma2QuantityBreakdown
															siteId={siteId}
															positionId={row.id}
															amount={row.actualQuantity}
															contractQuantity={row.plannedQuantity}
															organizationLanguage={organizationLanguage}
														/>{" "}
														<span className="text-xs text-muted-foreground">
															{row.unit}
														</span>
														{row.excludedQuantityRecords > 0 ? (
															<p className="text-xs text-muted-foreground">
																{t.quantityExcluded.replace(
																	"{count}",
																	String(row.excludedQuantityRecords),
																)}
															</p>
														) : null}
													</td>
													<td className="px-3 py-3 text-right tabular-nums">
														{money(row.plannedTotalCost)}
													</td>
													<td className="px-3 py-3 text-right tabular-nums">
														<DefaultConstructionForma2CostBreakdown
															siteId={siteId}
															positionId={row.id}
															costType="total"
															amount={row.actualTotalCost}
															organizationLanguage={organizationLanguage}
														/>
													</td>
													<td
														className={`px-4 py-3 text-right tabular-nums ${row.variance < 0 ? "text-destructive" : ""}`}
													>
														{money(row.variance)}
													</td>
												</tr>
											))
										: null}
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
