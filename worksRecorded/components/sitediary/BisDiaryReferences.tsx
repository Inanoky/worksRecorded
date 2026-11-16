"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { BisDiaryReferences } from "@/lib/bis/diary-references";

export function useBisDiaryReferences(
	siteId: string | null | undefined,
	enabled: boolean,
) {
	const identity = useProjectCacheScope();
	const key = `${identity}:${siteId}:${enabled}`;
	const currentKey = useRef(key);
	currentKey.current = key;
	const [state, setState] = useState<{
		key: string;
		data?: BisDiaryReferences;
		loading: boolean;
		error?: string;
	}>({ key, loading: false });
	const pending = useRef<{ key: string; promise: Promise<void> } | null>(null);
	const load = useCallback(
		(refresh = false) => {
			if (!siteId || !enabled) return Promise.resolve();
			if (pending.current?.key === key) return pending.current.promise;
			setState((old) => ({
				key,
				data: old.key === key ? old.data : undefined,
				loading: true,
			}));
			const promise = Promise.resolve()
				.then(() =>
					fetch(
						`/api/sites/${encodeURIComponent(siteId)}/bis-diary?kind=references${refresh ? "&refresh=1" : ""}`,
						{ cache: "no-store" },
					),
				)
				.then(async (response) => {
					if (!response.ok) throw new Error("Neizdevās ielādēt BIS sarakstus.");
					const result = await response.json();
					const data = result.data as BisDiaryReferences;
					if (!Array.isArray(data?.drawings) || !Array.isArray(data?.estimates))
						throw new Error("BIS atgrieza nepilnīgus sarakstus.");
					if (currentKey.current === key)
						setState({ key, data, loading: false });
				})
				.catch((error: unknown) => {
					if (currentKey.current === key)
						setState({
							key,
							loading: false,
							error:
								error instanceof Error
									? error.message
									: "Neizdevās ielādēt BIS sarakstus.",
						});
				})
				.finally(() => {
					if (pending.current?.promise === promise) pending.current = null;
				});
			pending.current = { key, promise };
			return promise;
		},
		[siteId, key, enabled],
	);
	useEffect(() => {
		void load();
	}, [load]);
	return {
		data: enabled && state.key === key ? state.data : undefined,
		error: enabled && state.key === key ? state.error : undefined,
		loading: enabled && (state.key !== key || state.loading),
		refresh: () => load(true),
	};
}

export function BisDiaryReferenceFields({
	references,
	documentIds,
	estimateId,
	onDocumentsChange,
	onEstimateChange,
	disabled = false,
}: {
	references: ReturnType<typeof useBisDiaryReferences>;
	documentIds: string[];
	estimateId: string;
	onDocumentsChange: (ids: string[]) => void;
	onEstimateChange: (id: string) => void;
	disabled?: boolean;
}) {
	const idPrefix = useId();
	const [search, setSearch] = useState("");
	const [estimatePickerOpen, setEstimatePickerOpen] = useState(false);
	const [estimateSearch, setEstimateSearch] = useState("");
	const drawings = references.data?.drawings ?? [];
	const estimates = references.data?.estimates ?? [];
	const estimatePickerDisabled =
		disabled || references.loading || !estimates.length;
	const estimateLabelId = `${idPrefix}-estimate-label`;
	const estimateValueId = `${idPrefix}-estimate-value`;
	const noEstimate = { id: "", label: "Nav izvēlēta" };
	const selectedEstimate = estimates.find((item) => item.id === estimateId);
	const estimateQuery = estimateSearch.trim().toLocaleLowerCase("lv");
	const estimateOptions = estimateQuery
		? estimates.filter((item) =>
				item.label.toLocaleLowerCase("lv").includes(estimateQuery),
			)
		: [noEstimate, ...estimates];
	const setEstimateOpen = (open: boolean) => {
		setEstimatePickerOpen(open);
		if (!open) setEstimateSearch("");
	};
	return (
		<fieldset disabled={disabled} className="space-y-3 rounded-md border p-4">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-semibold">BIS projekta atsauces</p>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					disabled={references.loading}
					onClick={references.refresh}
				>
					{references.loading ? "Ielādē…" : "Atjaunot sarakstus"}
				</Button>
			</div>
			{references.error ? (
				<p role="alert" className="text-sm text-destructive">
					{references.error}
				</p>
			) : null}
			<div className="min-w-0 space-y-1">
				<p id={estimateLabelId} className="text-xs font-medium">
					Tāmes pozīcija
				</p>
				<Popover
					modal
					open={estimatePickerOpen && !estimatePickerDisabled}
					onOpenChange={setEstimateOpen}
				>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							disabled={estimatePickerDisabled}
							aria-labelledby={`${estimateLabelId} ${estimateValueId}`}
							className="h-10 w-full min-w-0 justify-between font-normal"
						>
							<span id={estimateValueId} className="truncate">
								{selectedEstimate?.label ?? noEstimate.label}
							</span>
							<ChevronsUpDown
								aria-hidden="true"
								className="size-4 opacity-50"
							/>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						aria-labelledby={estimateLabelId}
						align="start"
						collisionPadding={12}
						className="flex max-h-[min(21rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden p-0"
					>
						<div className="flex shrink-0 items-center border-b px-3">
							<Search
								aria-hidden="true"
								className="mr-2 size-4 shrink-0 opacity-50"
							/>
							<Input
								aria-label="Meklēt pēc pozīcijas numura vai teksta"
								placeholder="Meklēt pēc numura vai teksta…"
								value={estimateSearch}
								onChange={(event) => setEstimateSearch(event.target.value)}
								className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
							/>
						</div>
						<div className="min-h-0 overflow-y-auto overscroll-contain p-1">
							{estimateOptions.map((item) => (
								<button
									key={item.id}
									type="button"
									aria-pressed={item.id === estimateId}
									className="flex w-full min-w-0 items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent"
									onClick={() => {
										onEstimateChange(item.id);
										setEstimateOpen(false);
									}}
								>
									<Check
										aria-hidden="true"
										className={`mt-0.5 size-4 shrink-0 ${item.id === estimateId ? "opacity-100" : "opacity-0"}`}
									/>
									<span className="min-w-0 break-words">{item.label}</span>
								</button>
							))}
							{estimateOptions.length === 0 ? (
								<output className="block px-3 py-6 text-center text-sm text-muted-foreground">
									Nav atrasta neviena tāmes pozīcija.
								</output>
							) : null}
						</div>
					</PopoverContent>
				</Popover>
			</div>
			{!references.loading && references.data && estimates.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					BIS šai kārtai nav pieejamu tāmes pozīciju.
				</p>
			) : null}
			<div className="space-y-2">
				<p className="text-xs font-medium">Būvprojekta lapa/rasējums</p>
				{drawings.length > 8 ? (
					<Input
						aria-label="Meklēt BIS rasējumu"
						placeholder="Meklēt rasējumu…"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				) : null}
				<div className="max-h-44 space-y-2 overflow-y-auto">
					{drawings
						.filter((item) =>
							item.label
								.toLocaleLowerCase()
								.includes(search.toLocaleLowerCase()),
						)
						.map((item) => (
							<label
								key={item.id}
								className="flex cursor-pointer items-start gap-2 text-sm"
								htmlFor={`${idPrefix}-${item.id}`}
							>
								<Checkbox
									id={`${idPrefix}-${item.id}`}
									disabled={disabled || references.loading}
									checked={documentIds.includes(item.id)}
									onCheckedChange={(checked) =>
										onDocumentsChange(
											checked === true
												? [...documentIds, item.id]
												: documentIds.filter((id) => id !== item.id),
										)
									}
								/>
								<span>{item.label}</span>
							</label>
						))}
				</div>
				{!references.loading && references.data && drawings.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						BIS lietā nav pieejamu būvprojekta lapu.
					</p>
				) : null}
			</div>
		</fieldset>
	);
}
