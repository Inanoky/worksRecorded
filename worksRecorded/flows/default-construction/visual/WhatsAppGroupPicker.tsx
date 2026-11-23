"use client";

import { Check, ChevronsUpDown, Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	filterWhatsAppGroups,
	type WhatsAppGroup,
} from "./whatsapp-groups-client";

export function WhatsAppGroupPicker({
	groups,
	value,
	disabled,
	onChange,
}: {
	groups: WhatsAppGroup[];
	value: string;
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const visible = filterWhatsAppGroups(groups, search);
	const selected = groups.find((group) => group.id === value);
	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (next) setSearch("");
				setOpen(next);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					className="w-full justify-between gap-2 font-normal"
					aria-label={
						selected ? `WhatsApp grupa · ${selected.name}` : "Izvēlēties grupu"
					}
				>
					<UsersRound className="size-4 shrink-0 text-muted-foreground" />
					<span className="min-w-0 flex-1 truncate text-left">
						{selected?.name ?? "Izvēlēties grupu"}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] min-w-0 space-y-2 p-2"
			>
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
					<Input
						aria-label="Meklēt grupu"
						placeholder="Meklēt grupu…"
						className="pl-9"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
				<fieldset
					className="max-h-56 space-y-1 overflow-y-auto"
					aria-label="Projekta WhatsApp grupas"
				>
					{visible.map((group) => (
						<Button
							key={group.id}
							type="button"
							variant="ghost"
							aria-pressed={value === group.id}
							className="h-auto min-h-9 w-full justify-between whitespace-normal text-left font-normal"
							onClick={() => {
								onChange(group.id);
								setOpen(false);
							}}
						>
							{group.name}
							{group.id === value ? (
								<Check className="size-4 shrink-0" />
							) : null}
						</Button>
					))}
					{!visible.length ? (
						<p className="px-2 py-3 text-sm text-muted-foreground">
							Nav atrasta neviena grupa.
						</p>
					) : null}
				</fieldset>
			</PopoverContent>
		</Popover>
	);
}
