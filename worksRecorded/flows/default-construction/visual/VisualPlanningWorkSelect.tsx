"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { isAreaUnit } from "./drawing-scale";
import { VISUAL_PLAN_MAX_LINKED_WORKS } from "./planning-model";

type Work = { work: string; unit: string; clientId?: string };

function sectionCode(work: string) {
	return (
		work.match(
			/\b(?:PA\d+(?:\.\d+)*|PT-\d+(?:-\d+)*|P-\d+(?:\.\d+)*)(?=\s|$)/iu,
		)?.[0] ?? ""
	);
}

function workName(work: string) {
	const separator = work.indexOf(" - ");
	if (separator >= 0) return work.slice(separator + 3);
	return (
		work
			.replace(sectionCode(work), "")
			.replace(/^\s*\d+\s+/, "")
			.trim() || work
	);
}

export function VisualPlanningWorkSelect({
	value,
	options,
	multiple,
	disabled,
	onChange,
}: {
	value: Work[];
	options: Work[];
	multiple: boolean;
	disabled: boolean;
	onChange: (works: Work[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [section, setSection] = useState("");
	const id = useId();
	const sections = [
		...new Set(options.map(({ work }) => sectionCode(work)).filter(Boolean)),
	];
	const filtered = options.filter(
		({ work }) =>
			(!section || sectionCode(work) === section) &&
			work
				.toLocaleLowerCase("lv")
				.includes(search.trim().toLocaleLowerCase("lv")),
	);
	return (
		<fieldset className="min-w-0 space-y-3">
			<legend className="mb-2 text-sm font-medium">
				Darbi šajā zonā ({value.length})
			</legend>
			{value.length ? (
				<ul aria-label="Izvēlētie darbi" className="space-y-2">
					{value.map((item) => (
						<li
							key={item.work}
							className="flex items-start gap-2 rounded-lg border p-3"
						>
							<div className="min-w-0 flex-1 space-y-1" title={item.work}>
								{sectionCode(item.work) ? (
									<span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium">
										{sectionCode(item.work)}
									</span>
								) : null}
								<p className="break-words text-sm">{workName(item.work)}</p>
							</div>
							{multiple ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									aria-label={`Noņemt darbu: ${item.work}`}
									disabled={disabled}
									onClick={() =>
										onChange(value.filter(({ work }) => work !== item.work))
									}
								>
									<X className="h-4 w-4" />
								</Button>
							) : null}
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">
					Izvēlieties darbu šai zonai.
				</p>
			)}
			<Popover
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) {
						setSearch("");
						setSection("");
					}
				}}
			>
				<PopoverTrigger asChild>
					<Button type="button" variant="outline" size="sm" disabled={disabled}>
						<Plus className="h-4 w-4" />
						{multiple ? "Pievienot darbu" : "Mainīt darbu"}
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-[min(24rem,calc(100vw-2rem))] space-y-3 p-3"
				>
					<Input
						aria-label="Meklēt darbus"
						placeholder="Meklēt darbus"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					{sections.length ? (
						<select
							aria-label="Filtrēt darbu sekciju"
							className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={section}
							onChange={(event) => setSection(event.target.value)}
						>
							<option value="">Visas sekcijas</option>
							{sections.map((code) => (
								<option key={code} value={code}>
									{code}
								</option>
							))}
						</select>
					) : null}
					<div className="max-h-64 space-y-1 overflow-y-auto">
						{filtered.map((option, index) => {
							const checked = value.some(({ work }) => work === option.work);
							const incompatible =
								multiple &&
								value.length > 0 &&
								(!isAreaUnit(option.unit) ||
									value.some((work) => !isAreaUnit(work.unit)));
							return (
								<div
									key={option.work}
									className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
								>
									<Checkbox
										id={`${id}-${index}`}
										aria-label={option.work}
										checked={checked}
										disabled={
											!checked &&
											(incompatible ||
												(multiple &&
													value.length >= VISUAL_PLAN_MAX_LINKED_WORKS))
										}
										onCheckedChange={(next) => {
											if (!multiple) {
												if (next === true) onChange([option]);
												setOpen(false);
												return;
											}
											onChange(
												next === true
													? [
															...value,
															{ ...option, clientId: crypto.randomUUID() },
														]
													: value.filter(({ work }) => work !== option.work),
											);
										}}
									/>
									<label
										htmlFor={`${id}-${index}`}
										className="min-w-0 flex-1 cursor-pointer space-y-1 text-sm"
									>
										{sectionCode(option.work) ? (
											<span className="block text-xs text-muted-foreground">
												{sectionCode(option.work)}
											</span>
										) : null}
										<span className="block break-words">
											{workName(option.work)}
										</span>
										{incompatible && !checked ? (
											<span className="block text-xs text-muted-foreground">
												Vairākiem darbiem vajadzīga m² mērvienība.
											</span>
										) : null}
									</label>
								</div>
							);
						})}
						{!filtered.length ? (
							<p className="p-2 text-sm text-muted-foreground">
								Darbi nav atrasti.
							</p>
						) : null}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full"
						onClick={() => setOpen(false)}
					>
						Gatavs
					</Button>
				</PopoverContent>
			</Popover>
		</fieldset>
	);
}
