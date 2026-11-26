"use client";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type FimaCollaboration,
	fimaStatuses,
} from "@/lib/fima/diary-collaboration";

const badgeTones = {
	do_not_create: "border-red-200 bg-red-50 text-red-700",
	needs_changes: "border-amber-200 bg-amber-50 text-amber-700",
	coordinate_with_fima: "border-violet-200 bg-violet-50 text-violet-700",
	updated: "border-sky-200 bg-sky-50 text-sky-700",
	ai_prepared: "border-yellow-200 bg-yellow-50 text-yellow-800",
	bis_draft: "border-teal-200 bg-teal-50 text-teal-700",
	approved: "border-emerald-200 bg-emerald-100 text-emerald-800",
	ready_for_approval: "border-[#B8E0C6] bg-[#ECF8F0] text-[#159447]",
	waiting_for_materials: "border-orange-200 bg-orange-50 text-orange-800",
	unset: "border-[#E1E6ED] bg-slate-50 text-slate-600",
};
type BadgeSelectPresentation = {
	saving?: boolean;
	disabled?: boolean;
	label?: string;
	actor?: { actorName: string; at: string };
	history?: ReactNode;
};

const fimaChoices = { unset: "Nav atzīmes", ...fimaStatuses };

export function FimaStatusSelect({
	status,
	selectStatus,
	...props
}: BadgeSelectPresentation & {
	status: FimaCollaboration["status"];
	selectStatus: (value: FimaCollaboration["status"]) => void;
}) {
	return (
		<DiaryStatusSelect
			{...props}
			status={status ?? "unset"}
			selectStatus={(value) => selectStatus(value === "unset" ? null : value)}
			choices={fimaChoices}
			tones={badgeTones}
		/>
	);
}

export function DiaryStatusSelect<T extends string>({
	status,
	selectStatus,
	saving = false,
	disabled = false,
	label = "Ieraksta rīcība",
	actor,
	history,
	choices,
	tones,
}: BadgeSelectPresentation & {
	status: T;
	selectStatus: (value: T) => void;
	choices: Readonly<Record<T, string>>;
	tones: Readonly<Record<T, string>>;
}) {
	return (
		<div aria-busy={saving} className="min-w-0" data-fima-interactive>
			<div className="flex min-w-0 flex-wrap items-start gap-1">
				<Select
					value={status}
					disabled={disabled}
					onValueChange={(value) => {
						if (Object.hasOwn(choices, value)) selectStatus(value as T);
					}}
				>
					<SelectTrigger
						aria-label={label}
						data-fima-badge
						className="h-auto min-h-0 w-fit min-w-0 max-w-full items-start gap-1 border-0 bg-transparent p-0 shadow-none data-[size=default]:h-auto [&>svg]:mt-1 [&>svg]:size-3 [&>[data-slot=select-value]]:line-clamp-none"
						title="Organizācijas iekšējā rīcība. Izmaiņas saglabājas fonā; atzīme pati par sevi nesūta ierakstu uz BIS."
					>
						<SelectValue className="min-w-0 max-w-full flex-1">
							<Badge
								variant="outline"
								className={`block max-w-full min-w-0 shrink whitespace-normal [overflow-wrap:anywhere] px-1.5 text-left text-[11px] leading-snug ${tones[status]}`}
							>
								{choices[status]}
							</Badge>
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(choices) as T[]).map((key) => (
							<SelectItem key={key} value={key}>
								{choices[key]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{history}
			</div>
			{actor ? (
				<p
					className="mt-1 truncate text-[10px] leading-snug text-muted-foreground"
					title={`${actor.actorName} · ${new Date(actor.at).toLocaleString("lv-LV", { timeZone: "Europe/Riga" })}`}
				>
					{actor.actorName}
				</p>
			) : null}
			<span className="sr-only" aria-live="polite">
				{saving ? "Rīcība tiek saglabāta fonā" : ""}
			</span>
		</div>
	);
}
