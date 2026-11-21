"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type Project = { id: string; name: string };
const allProjects: Project = { id: "", name: "Visi projekti" };

function searchText(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("lv")
		.trim();
}

export function MaterialProjectSelect({
	id,
	value,
	projects,
	onValueChange,
}: {
	id: string;
	value: string;
	projects: Project[];
	onValueChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listId = useId();
	const query = searchText(search);
	const filtered = projects.filter((project) =>
		searchText(project.name).includes(query),
	);
	const options = [allProjects, ...filtered];
	const preferredId = activeId ?? (query ? (filtered[0]?.id ?? "") : value);
	const activeIndex =
		query && !filtered.length && activeId === null
			? -1
			: Math.max(
					0,
					options.findIndex((option) => option.id === preferredId),
				);
	const optionId = (project: Project) =>
		project.id
			? `${listId}-project-${encodeURIComponent(project.id)}`
			: `${listId}-all`;
	const activeOptionId =
		activeIndex >= 0 ? optionId(options[activeIndex]) : undefined;
	const selectedName = value
		? (projects.find((project) => project.id === value)?.name ??
			"Projekts nav pieejams")
		: allProjects.name;

	function changeOpen(next: boolean) {
		setOpen(next);
		setSearch("");
		setActiveId(null);
	}
	function select(project: Project) {
		onValueChange(project.id);
		changeOpen(false);
	}
	useEffect(() => {
		if (open && activeOptionId)
			document
				.getElementById(activeOptionId)
				?.scrollIntoView?.({ block: "nearest" });
	}, [open, activeOptionId]);

	function option(project: Project, index: number) {
		return (
			<button
				key={project.id}
				id={optionId(project)}
				type="button"
				role="option"
				aria-selected={project.id === value}
				tabIndex={-1}
				data-active={index === activeIndex}
				className="flex w-full min-w-0 items-start gap-2 rounded-md px-3 py-2 text-left text-sm font-normal hover:bg-muted data-[active=true]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
				onPointerMove={() => setActiveId(project.id)}
				onClick={() => select(project)}
			>
				<Check
					aria-hidden="true"
					className={`mt-0.5 h-4 w-4 shrink-0 text-green-700 ${project.id === value ? "opacity-100" : "opacity-0"}`}
				/>
				<span className="min-w-0 break-words">{project.name}</span>
			</button>
		);
	}

	return (
		<Popover open={open} onOpenChange={changeOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open ? listId : undefined}
					className="mt-2 h-9 w-full min-w-40 justify-between px-3 text-left font-normal"
					title={selectedName}
					onKeyDown={(event) => {
						if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
						event.preventDefault();
						changeOpen(true);
						if (event.key === "ArrowUp") setActiveId(projects.at(-1)?.id ?? "");
					}}
				>
					<span className="min-w-0 truncate">{selectedName}</span>
					<ChevronsUpDown
						aria-hidden="true"
						className="h-4 w-4 shrink-0 text-muted-foreground"
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				aria-label="Projektu izvēle"
				collisionPadding={12}
				className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-1.5rem)] flex-col gap-2 p-2"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					inputRef.current?.focus();
				}}
			>
				<div className="relative shrink-0">
					<Search
						aria-hidden="true"
						className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
					/>
					<Input
						ref={inputRef}
						aria-label="Meklēt projektu"
						placeholder="Meklēt projektu…"
						autoComplete="off"
						aria-controls={listId}
						aria-activedescendant={activeOptionId}
						value={search}
						className="h-10 pl-9 pr-10 font-normal"
						onChange={(event) => {
							setSearch(event.target.value);
							setActiveId(null);
						}}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing) return;
							if (event.key === "ArrowDown" || event.key === "ArrowUp") {
								event.preventDefault();
								const next =
									(activeIndex +
										(event.key === "ArrowDown" ? 1 : -1) +
										options.length) %
									options.length;
								setActiveId(options[next].id);
							} else if (event.key === "Enter") {
								event.preventDefault();
								if (activeIndex >= 0) select(options[activeIndex]);
							}
						}}
					/>
					{search ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Notīrīt meklēšanu"
							className="absolute right-1 top-1 h-8 w-8"
							onClick={() => {
								setSearch("");
								setActiveId(null);
								inputRef.current?.focus();
							}}
						>
							<X className="h-4 w-4" />
						</Button>
					) : null}
				</div>
				<div
					id={listId}
					role="listbox"
					aria-label="Projekti"
					className="flex min-h-0 flex-col gap-1"
				>
					<div className="shrink-0">{option(allProjects, 0)}</div>
					<div className="max-h-64 min-h-0 overflow-y-auto overscroll-contain">
						{filtered.map((project, index) => option(project, index + 1))}
					</div>
				</div>
				{!filtered.length ? (
					<output className="block px-3 py-2 text-sm font-normal text-muted-foreground">
						Projekti nav atrasti.
					</output>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
