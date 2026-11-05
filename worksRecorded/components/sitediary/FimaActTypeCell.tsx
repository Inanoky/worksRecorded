"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type FimaActType,
	fimaActTypes,
	formatFimaActType,
	formatFimaActTypeCell,
} from "@/lib/fima/act-types";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { FimaBadgeHistory } from "./FimaBadgeHistory";
import { useFimaDiaryChoice } from "./useFimaDiaryChoice";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	linkedActType?: FimaActType | null;
	onChange: (id: string, state: FimaCollaboration) => void;
};

export function FimaActTypeCell(props: Props) {
	const { value, selectValue, saving, recovering } = useFimaDiaryChoice({
		...props,
		field: "actType",
		fallback: props.linkedActType,
	});
	const actType = value as FimaActType | null;
	const latest = props.state.history.findLast(
		(event) => event.kind === "act_type",
	);
	const label = formatFimaActType(actType);
	return (
		<div className="min-w-0 space-y-1" data-fima-interactive aria-busy={saving}>
			<div className="min-w-0">
				<Select
					value={actType ?? "unset"}
					disabled={recovering}
					onValueChange={(value) =>
						selectValue(value === "unset" ? null : (value as FimaActType))
					}
				>
					<SelectTrigger
						aria-label="Akta veids"
						title={label}
						className="h-auto min-h-8 w-full min-w-0 items-start gap-1 px-1.5 py-1 text-left text-xs data-[size=default]:h-auto [&>svg]:mt-0.5 [&>svg]:size-3 [&>[data-slot=select-value]]:line-clamp-none"
					>
						<SelectValue>
							<span className="line-clamp-3 whitespace-normal [overflow-wrap:anywhere]">
								{formatFimaActTypeCell(actType)}
							</span>
						</SelectValue>
					</SelectTrigger>
					<SelectContent className="max-w-[calc(100vw-2rem)]">
						<SelectItem value="unset">Nav izvēlēts</SelectItem>
						{Object.entries(fimaActTypes).map(([key, name]) => (
							<SelectItem
								key={key}
								value={key}
								className="max-w-lg whitespace-normal [overflow-wrap:anywhere]"
							>
								{name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex min-w-0 items-start justify-between gap-1">
				{latest ? (
					<p className="min-w-0 text-xs text-muted-foreground">
						<span className="block truncate" title={latest.actorName}>
							{latest.actorName}
						</span>
						<time dateTime={latest.at} className="block tabular-nums">
							{new Date(latest.at).toLocaleDateString("lv-LV", {
								timeZone: "Europe/Riga",
							})}
						</time>
					</p>
				) : props.state.actType === undefined && props.linkedActType ? (
					<p className="min-w-0 text-xs text-muted-foreground">
						No piesaistītā BIS akta
					</p>
				) : (
					<span />
				)}
				<FimaBadgeHistory
					key={`${props.siteId}:${props.recordId}`}
					{...props}
					kind="act_type"
				/>
			</div>
			<span className="sr-only" aria-live="polite">
				{saving ? "Akta veids tiek saglabāts fonā" : ""}
			</span>
		</div>
	);
}
