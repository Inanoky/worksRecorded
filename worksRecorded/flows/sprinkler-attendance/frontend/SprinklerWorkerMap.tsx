"use client";

import { Clock3, MapPin, Navigation, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

type MapWorker = {
	id: string;
	name: string;
	initials: string;
	project: string;
	location: string;
	duration: string;
	clockIn: string;
	clockOut: string;
	status: "on-site" | "completed" | "attention";
};

const workerMarkerPositions: Record<string, { left: string; top: string }> = {
	"worker-1": { left: "67%", top: "72%" },
	"worker-2": { left: "71%", top: "68%" },
	"worker-3": { left: "61%", top: "46%" },
	"worker-4": { left: "54%", top: "30%" },
	"worker-5": { left: "65%", top: "50%" },
};

const statusLabels = {
	"on-site": "Objektā",
	completed: "Darbs pabeigts",
	attention: "Nav darba beigu atzīmes",
} as const;

function markerClasses(status: MapWorker["status"]) {
	if (status === "on-site") {
		return "border-emerald-200 bg-emerald-600 text-white shadow-emerald-900/30";
	}
	if (status === "attention") {
		return "border-amber-200 bg-amber-500 text-white shadow-amber-900/30";
	}
	return "border-white bg-slate-800 text-white shadow-slate-900/30";
}

function statusDotClasses(status: MapWorker["status"]) {
	if (status === "on-site") return "bg-emerald-500";
	if (status === "attention") return "bg-amber-500";
	return "bg-slate-400";
}

export function SprinklerWorkerMap({ workers }: { workers: MapWorker[] }) {
	const [selectedWorkerId, setSelectedWorkerId] = useState(
		workers.find((worker) => worker.status === "on-site")?.id ??
			workers[0]?.id ??
			"",
	);

	const selectedWorker = useMemo(
		() =>
			workers.find((worker) => worker.id === selectedWorkerId) ?? workers[0],
		[selectedWorkerId, workers],
	);

	function selectWorker(worker: MapWorker) {
		setSelectedWorkerId(worker.id);
	}

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
			<Card className="gap-0 overflow-hidden py-0 shadow-none">
				<CardHeader className="border-b py-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle>Darbinieki Rīgā</CardTitle>
							<CardDescription className="mt-1">
								Darbinieku reģistrētā atrašanās vieta izvēlētajā dienā
							</CardDescription>
						</div>
						<Badge variant="secondary">
							<Users />
							{workers.length}{" "}
							{workers.length === 1 ? "darbinieks" : "darbinieki"}
						</Badge>
					</div>
				</CardHeader>
				<div className="relative h-[420px] overflow-hidden bg-muted lg:h-[560px]">
					<iframe
						title="Rīgas karte"
						src="https://www.google.com/maps?q=Riga%2C%20Latvia&z=12&output=embed"
						className="pointer-events-none absolute inset-0 size-full border-0"
						referrerPolicy="no-referrer-when-downgrade"
					/>
					<div className="pointer-events-none absolute inset-0 bg-foreground/5" />
					{workers.map((worker) => {
						const position = workerMarkerPositions[worker.id];
						if (!position) return null;
						return (
							<button
								key={worker.id}
								type="button"
								aria-label={`Izvēlēties darbinieku ${worker.name}`}
								aria-pressed={selectedWorker?.id === worker.id}
								className={cn(
									"absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 text-xs font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/80",
									markerClasses(worker.status),
									selectedWorker?.id === worker.id &&
										"scale-110 ring-4 ring-white/90",
								)}
								style={position}
								onClick={() => selectWorker(worker)}
							>
								{worker.initials}
							</button>
						);
					})}
					<Badge className="absolute top-3 left-3 z-10 border bg-background/95 text-foreground shadow-sm">
						Rīgas kartes priekšskatījums
					</Badge>
					<div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-lg border bg-background/95 p-2 text-xs shadow-sm backdrop-blur">
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-full bg-emerald-500" /> Objektā
						</span>
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-full bg-slate-400" /> Darbs
							pabeigts
						</span>
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-full bg-amber-500" /> Jāpārbauda
						</span>
					</div>
				</div>
			</Card>

			<Card className="gap-0 overflow-hidden py-0 shadow-none">
				<CardHeader className="border-b py-5">
					<CardTitle className="text-base">
						Darbinieku atrašanās vietas
					</CardTitle>
					<CardDescription>
						Izvēlieties darbinieku kartē vai sarakstā
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="divide-y">
						{workers.map((worker) => (
							<Button
								key={worker.id}
								variant="ghost"
								aria-pressed={selectedWorker?.id === worker.id}
								className={cn(
									"h-auto w-full justify-start rounded-none px-4 py-3 text-left",
									selectedWorker?.id === worker.id && "bg-muted",
								)}
								onClick={() => selectWorker(worker)}
							>
								<span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
									{worker.initials}
									<span
										className={cn(
											"absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background",
											statusDotClasses(worker.status),
										)}
									/>
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-center justify-between gap-2">
										<span className="truncate font-medium">{worker.name}</span>
										<span className="font-mono text-xs text-muted-foreground">
											{worker.duration}
										</span>
									</span>
									<span className="mt-0.5 block truncate text-xs text-muted-foreground">
										{worker.project} · {worker.location}
									</span>
								</span>
							</Button>
						))}
					</div>
					{selectedWorker ? (
						<div className="border-t bg-muted/30 p-4">
							<div className="flex items-center gap-2 text-sm font-medium">
								<Navigation className="size-4 text-emerald-600" />
								{selectedWorker.project}
							</div>
							<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
								<MapPin className="size-3" /> {selectedWorker.location}
							</p>
							<div className="mt-3 flex items-center justify-between gap-3 text-xs">
								<span className="flex items-center gap-1 text-muted-foreground">
									<Clock3 className="size-3.5" /> {selectedWorker.clockIn}–
									{selectedWorker.clockOut}
								</span>
								<Badge variant="outline">
									{statusLabels[selectedWorker.status]}
								</Badge>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
