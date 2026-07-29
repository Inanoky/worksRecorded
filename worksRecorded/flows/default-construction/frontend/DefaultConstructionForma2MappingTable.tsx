"use client";

import { Link2, Loader2, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type getDefaultConstructionForma2MappingPage,
	saveDefaultConstructionForma2Allocations,
} from "@/flows/default-construction/backend/forma2-analytics-actions";
import {
	getForma2AnalyticsCopy,
	getForma2AnalyticsLocale,
} from "@/flows/default-construction/lib/forma2-analytics-copy";

type MappingData = Awaited<
	ReturnType<typeof getDefaultConstructionForma2MappingPage>
>;
type MappingRow = MappingData["rows"][number];

function formatCurrency(value: number, locale: string) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatNumber(value: number | null, locale: string) {
	if (value == null) return "—";
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
		value,
	);
}

export function DefaultConstructionForma2MappingTable({
	siteId,
	organizationLanguage,
	data,
}: {
	siteId: string;
	organizationLanguage?: string | null;
	data: MappingData;
}) {
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const locale = getForma2AnalyticsLocale(organizationLanguage);
	const router = useRouter();
	const [selectedRow, setSelectedRow] = useState<MappingRow | null>(null);
	const [positionSearch, setPositionSearch] = useState("");
	const [saving, setSaving] = useState(false);
	const [applying, setApplying] = useState(false);

	const compatiblePositions = useMemo(() => {
		if (!selectedRow) return [];
		const search = positionSearch.trim().toLocaleLowerCase("lv");
		return data.positionOptions.filter((position) => {
			const compatible =
				selectedRow.type === "work"
					? position.kind === "work"
					: position.kind === "material" ||
						(position.kind === "work" && !position.parentId);
			if (!compatible) return false;
			if (!search) return true;
			return `${position.code} ${position.name} ${position.categoryName}`
				.toLocaleLowerCase("lv")
				.includes(search);
		});
	}, [data.positionOptions, positionSearch, selectedRow]);

	const positionsById = useMemo(
		() =>
			new Map(data.positionOptions.map((position) => [position.id, position])),
		[data.positionOptions],
	);

	const assign = async (positionId: string | null) => {
		if (!selectedRow) return;
		setSaving(true);
		try {
			await saveDefaultConstructionForma2Allocations({
				siteId,
				allocations: [
					{
						sourceType: selectedRow.type,
						sourceId: selectedRow.id,
						positionId,
						method: "manual",
					},
				],
			});
			setSelectedRow(null);
			setPositionSearch("");
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setSaving(false);
		}
	};

	const applySuggestions = async () => {
		setApplying(true);
		try {
			const response = await fetch(
				`/api/sites/${encodeURIComponent(siteId)}/forma2/auto-assign`,
				{ method: "POST" },
			);
			const result = (await response.json()) as {
				assignedRecords?: number;
				error?: string;
			};
			if (!response.ok) throw new Error(result.error || t.saveError);
			router.refresh();
			toast.success(t.suggestionsApplied(Number(result.assignedRecords) || 0));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setApplying(false);
		}
	};

	return (
		<>
			<div className="flex justify-end px-6 pb-4">
				<Button
					variant="outline"
					onClick={applySuggestions}
					disabled={!data.document || applying}
				>
					{applying ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						<Sparkles className="mr-2 size-4" />
					)}
					{applying ? t.applying : t.applySuggestions}
				</Button>
			</div>
			<div className="overflow-auto border-y">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="min-w-72 pl-6">{t.source}</TableHead>
							<TableHead>{t.type}</TableHead>
							<TableHead>{t.quantity}</TableHead>
							<TableHead className="text-right">{t.actualCost}</TableHead>
							<TableHead className="min-w-72 pr-6">{t.position}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.rows.map((row) => {
							const assigned = row.assignedPositionId
								? positionsById.get(row.assignedPositionId)
								: null;
							const suggested = row.suggestedPositionId
								? positionsById.get(row.suggestedPositionId)
								: null;
							return (
								<TableRow key={`${row.type}:${row.id}`}>
									<TableCell className="pl-6 align-top">
										<div className="font-medium">{row.label}</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{row.secondaryLabel || "—"}
										</div>
										{suggested ? (
											<div className="mt-2 text-xs text-blue-600">
												{t.suggested}:{" "}
												{suggested.code ? `${suggested.code} ` : ""}
												{suggested.name} (
												{Math.round(Number(row.suggestionConfidence) * 100)}%)
											</div>
										) : null}
									</TableCell>
									<TableCell className="align-top">
										<Badge variant="outline">
											{row.type === "work" ? t.work : t.material}
										</Badge>
									</TableCell>
									<TableCell className="align-top">
										{formatNumber(row.quantity, locale)} {row.unit}
									</TableCell>
									<TableCell className="text-right align-top">
										{row.actualCost == null
											? "—"
											: formatCurrency(row.actualCost, locale)}
									</TableCell>
									<TableCell className="pr-6 align-top">
										<Button
											variant="outline"
											className="h-auto w-full justify-start whitespace-normal py-2 text-left"
											onClick={() => {
												setPositionSearch("");
												setSelectedRow(row);
											}}
											disabled={!data.document}
										>
											<Link2 className="mr-2 size-4 shrink-0" />
											{assigned
												? `${assigned.code ? `${assigned.code} ` : ""}${assigned.name}`
												: t.unassignedOption}
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
						{!data.rows.length ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="h-28 text-center text-muted-foreground"
								>
									{t.noRecords}
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</div>

			<Dialog
				open={Boolean(selectedRow)}
				onOpenChange={(open) => {
					if (!open && !saving) setSelectedRow(null);
				}}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>{t.assignTitle}</DialogTitle>
						<DialogDescription>
							{selectedRow?.label} · {t.assignDescription}
						</DialogDescription>
					</DialogHeader>
					<div className="relative">
						<Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
						<Input
							value={positionSearch}
							onChange={(event) => setPositionSearch(event.target.value)}
							placeholder={t.positionSearch}
							className="pl-9"
						/>
					</div>
					<div className="max-h-[55vh] space-y-1 overflow-y-auto rounded-md border p-2">
						<Button
							variant={!selectedRow?.assignedPositionId ? "secondary" : "ghost"}
							className="w-full justify-start"
							onClick={() => assign(null)}
							disabled={saving}
						>
							{t.unassignedOption}
						</Button>
						{compatiblePositions.map((position) => (
							<Button
								key={position.id}
								variant={
									selectedRow?.assignedPositionId === position.id
										? "secondary"
										: "ghost"
								}
								className="h-auto w-full justify-start whitespace-normal py-2 text-left"
								onClick={() => assign(position.id)}
								disabled={saving}
							>
								<span>
									{position.code ? `${position.code} ` : "↳ "}
									{position.name}
								</span>
							</Button>
						))}
					</div>
					{saving ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							{t.applying}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
