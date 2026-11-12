"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { BisDiaryReferences } from "@/lib/bis/diary-references";

export function useBisDiaryReferences(
	siteId: string | null | undefined,
	enabled: boolean,
) {
	const identity = useProjectCacheScope();
	const key = `${identity}:${siteId}`;
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
			const promise = import("@/server/actions/bis-diary-references")
				.then(({ loadBisDiaryReferenceOptions }) =>
					loadBisDiaryReferenceOptions(siteId, refresh),
				)
				.then((result) => {
					if (!result.ok) throw new Error(result.error);
					const data = result.data;
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
		data: state.key === key ? state.data : undefined,
		error: state.key === key ? state.error : undefined,
		loading: state.key !== key || state.loading,
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
	const drawings = references.data?.drawings ?? [];
	const estimates = references.data?.estimates ?? [];
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
			<label className="block space-y-1 text-xs font-medium">
				Tāmes pozīcija
				<select
					className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
					value={estimateId}
					disabled={!references.data || references.loading}
					onChange={(event) => onEstimateChange(event.target.value)}
				>
					<option value="">Nav izvēlēta</option>
					{estimates.map((item) => (
						<option key={item.id} value={item.id}>
							{item.label}
						</option>
					))}
				</select>
			</label>
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
