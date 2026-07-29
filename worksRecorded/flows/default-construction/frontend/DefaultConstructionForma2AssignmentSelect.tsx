"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	saveDefaultConstructionForma2Allocations,
	saveDefaultConstructionForma2MaterialRule,
} from "@/flows/default-construction/backend/forma2-analytics-actions";

export type Forma2MaterialPositionOption = {
	id: string;
	code: string;
	name: string;
	categoryName: string;
	kind: "work" | "material" | "mechanism";
	parentId: string | null;
	unit: string;
};

export function DefaultConstructionForma2AssignmentSelect({
	siteId,
	sourceId,
	value,
	options,
	organizationLanguage,
	assignmentMode = "single",
	onAssigned,
}: {
	siteId: string;
	sourceId: string;
	value: string | null;
	options: Forma2MaterialPositionOption[];
	organizationLanguage?: string | null;
	assignmentMode?: "single" | "similar-rule";
	onAssigned: (positionId: string | null) => void;
}) {
	const isLatvian = String(organizationLanguage ?? "")
		.toLowerCase()
		.startsWith("lv");
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [saving, setSaving] = useState(false);
	const selected = options.find((option) => option.id === value);
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase("lv");
		if (!query) return options;
		return options.filter((option) =>
			`${option.code} ${option.categoryName} ${option.name} ${option.unit}`
				.toLocaleLowerCase("lv")
				.includes(query),
		);
	}, [options, search]);

	const assign = async (positionId: string | null) => {
		setSaving(true);
		try {
			const ruleResult =
				assignmentMode === "similar-rule" && positionId
					? await saveDefaultConstructionForma2MaterialRule({
							siteId,
							sourceId,
							positionId,
						})
					: null;
			if (!ruleResult) {
				await saveDefaultConstructionForma2Allocations({
					siteId,
					allocations: [
						{
							sourceType: "material",
							sourceId,
							positionId,
							method: "manual",
						},
					],
				});
			}
			onAssigned(positionId);
			setOpen(false);
			setSearch("");
			toast.success(
				ruleResult
					? isLatvian
						? `Noteikums saglabāts; piesaistīti ${ruleResult.assignedRecords} ieraksti.`
						: `Rule saved; ${ruleResult.assignedRecords} records assigned.`
					: isLatvian
						? "Formas 2 pozīcija saglabāta."
						: "Forma 2 position saved.",
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: isLatvian
						? "Neizdevās saglabāt Formas 2 pozīciju."
						: "Could not save the Forma 2 position.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					disabled={saving}
					className="h-auto min-h-9 w-full min-w-[230px] justify-between whitespace-normal px-3 py-2 text-left font-normal"
				>
					<span className="line-clamp-2">
						{selected
							? `${selected.code ? `${selected.code} ` : ""}${selected.name}`
							: isLatvian
								? "Nav piesaistīts"
								: "Unassigned"}
					</span>
					{saving ? (
						<Loader2 className="ml-2 size-4 shrink-0 animate-spin" />
					) : (
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[420px] max-w-[calc(100vw-2rem)] p-2"
			>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={isLatvian ? "Meklēt pozīciju..." : "Search positions..."}
					className="mb-2"
				/>
				<div className="max-h-72 overflow-y-auto">
					<button
						type="button"
						onClick={() => assign(null)}
						className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
					>
						<Check className={`mr-2 size-4 ${value ? "opacity-0" : ""}`} />
						{isLatvian ? "Nav piesaistīts" : "Unassigned"}
					</button>
					{filtered.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => assign(option.id)}
							className="flex w-full items-start rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
						>
							<Check
								className={`mr-2 mt-0.5 size-4 shrink-0 ${value === option.id ? "" : "opacity-0"}`}
							/>
							<span>
								<span className="block">
									{option.code ? `${option.code} ` : ""}
									{option.name}
								</span>
								<span className="block text-xs text-muted-foreground">
									{option.categoryName}
									{option.unit ? ` · ${option.unit}` : ""}
								</span>
							</span>
						</button>
					))}
					{filtered.length === 0 ? (
						<p className="px-2 py-6 text-center text-sm text-muted-foreground">
							{isLatvian ? "Pozīcija nav atrasta." : "No position found."}
						</p>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}
