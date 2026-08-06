"use client";

import {
	AlertCircle,
	ArrowDownToLine,
	BriefcaseBusiness,
	CalendarDays,
	Check,
	ChevronLeft,
	ChevronRight,
	CircleDot,
	Clock3,
	MapPin,
	MapPinned,
	Search,
	Users,
} from "lucide-react";
import Image from "next/image";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppIcon } from "@/components/ui/whatsappIcon";
import { SprinklerWorkerMap } from "@/flows/sprinkler-attendance/frontend/SprinklerWorkerMap";
import { cn } from "@/lib/utils/utils";

type WorkerStatus = "on-site" | "completed" | "attention";

type WorkerRecord = {
	id: string;
	name: string;
	initials: string;
	role: string;
	project: string;
	location: string;
	clockIn: string;
	clockOut: string;
	duration: string;
	durationMinutes: number;
	status: WorkerStatus;
	timelineStart: number;
	timelineWidth: number;
};

const workers: WorkerRecord[] = [
	{
		id: "worker-1",
		name: "Aleks Petrov",
		initials: "AP",
		role: "Darbu vadītājs",
		project: "Krasta ielas biroju centrs",
		location: "A bloks · 4. stāvs",
		clockIn: "07:38",
		clockOut: "Strādā pašlaik",
		duration: "8 st. 22 min.",
		durationMinutes: 502,
		status: "on-site",
		timelineStart: 5.3,
		timelineWidth: 69.7,
	},
	{
		id: "worker-2",
		name: "Marek Nowak",
		initials: "MN",
		role: "Sprinkleru montētājs",
		project: "Krasta ielas biroju centrs",
		location: "B bloks · 2. stāvs",
		clockIn: "07:51",
		clockOut: "16:12",
		duration: "7 st. 51 min.",
		durationMinutes: 471,
		status: "completed",
		timelineStart: 7.1,
		timelineWidth: 69.6,
	},
	{
		id: "worker-3",
		name: "Jānis Ozols",
		initials: "JO",
		role: "Cauruļvadu montētājs",
		project: "Brīvības ielas medicīnas centrs",
		location: "Austrumu spārns · Tehniskā telpa",
		clockIn: "08:04",
		clockOut: "Nav reģistrēts",
		duration: "7 st. 56 min.",
		durationMinutes: 476,
		status: "attention",
		timelineStart: 8.9,
		timelineWidth: 66.1,
	},
	{
		id: "worker-4",
		name: "Daniel Kowalski",
		initials: "DK",
		role: "Sprinkleru montētājs",
		project: "Skanstes ielas dzīvojamais nams",
		location: "C ēka · 1. stāvs",
		clockIn: "08:21",
		clockOut: "15:46",
		duration: "6 st. 55 min.",
		durationMinutes: 415,
		status: "completed",
		timelineStart: 11.3,
		timelineWidth: 61.8,
	},
	{
		id: "worker-5",
		name: "Tomasz Zieliński",
		initials: "TZ",
		role: "Māceklis",
		project: "Brīvības ielas medicīnas centrs",
		location: "Austrumu spārns · 3. stāvs",
		clockIn: "08:47",
		clockOut: "15:32",
		duration: "6 st. 15 min.",
		durationMinutes: 375,
		status: "completed",
		timelineStart: 14.9,
		timelineWidth: 56.3,
	},
];

const projects = [
	{
		name: "Krasta ielas biroju centrs",
		location: "Krasta iela 76, Rīga",
		workers: 2,
		hours: "16 st. 13 min.",
		share: 43,
	},
	{
		name: "Brīvības ielas medicīnas centrs",
		location: "Brīvības iela 201, Rīga",
		workers: 2,
		hours: "14 st. 11 min.",
		share: 37,
	},
	{
		name: "Skanstes ielas dzīvojamais nams",
		location: "Skanstes iela 25, Rīga",
		workers: 1,
		hours: "6 st. 55 min.",
		share: 20,
	},
];

const activity = [
	{
		id: "activity-1",
		worker: "Marek Nowak",
		action: "reģistrēja darba beigas",
		project: "Krasta ielas biroju centrs",
		time: "16:12",
		tone: "complete",
	},
	{
		id: "activity-2",
		worker: "Daniel Kowalski",
		action: "reģistrēja darba beigas",
		project: "Skanstes ielas dzīvojamais nams",
		time: "15:46",
		tone: "complete",
	},
	{
		id: "activity-3",
		worker: "Tomasz Zieliński",
		action: "reģistrēja darba beigas",
		project: "Brīvības ielas medicīnas centrs",
		time: "15:32",
		tone: "complete",
	},
	{
		id: "activity-4",
		worker: "Aleks Petrov",
		action: "reģistrēja darba sākumu",
		project: "Krasta ielas biroju centrs",
		time: "07:38",
		tone: "active",
	},
];

const timelineHours = ["07", "09", "11", "13", "15", "17", "19"];

const statusLabels: Record<WorkerStatus, string> = {
	"on-site": "Objektā",
	completed: "Pabeigts",
	attention: "Nav darba beigu atzīmes",
};

function shiftDate(date: string, days: number) {
	const nextDate = new Date(`${date}T12:00:00Z`);
	nextDate.setUTCDate(nextDate.getUTCDate() + days);
	return nextDate.toISOString().slice(0, 10);
}

function formatDate(date: string) {
	return new Intl.DateTimeFormat("lv-LV", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(new Date(`${date}T12:00:00Z`));
}

function StatusBadge({ status }: { status: WorkerStatus }) {
	if (status === "on-site") {
		return (
			<Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
				<CircleDot className="fill-emerald-500 text-emerald-500" />
				{statusLabels[status]}
			</Badge>
		);
	}

	if (status === "attention") {
		return (
			<Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
				<AlertCircle />
				{statusLabels[status]}
			</Badge>
		);
	}

	return (
		<Badge variant="secondary" className="text-muted-foreground">
			<Check />
			{statusLabels[status]}
		</Badge>
	);
}

function WorkerTimeline({ worker }: { worker: WorkerRecord }) {
	return (
		<div className="min-w-[330px]">
			<div className="mb-2 flex justify-between font-mono text-[10px] text-muted-foreground">
				{timelineHours.map((hour) => (
					<span key={hour}>{hour}</span>
				))}
			</div>
			<div className="relative h-2.5 rounded-full bg-muted">
				<div
					className={cn(
						"absolute inset-y-0 rounded-full",
						worker.status === "attention" ? "bg-amber-400" : "bg-emerald-500",
					)}
					style={{
						left: `${worker.timelineStart}%`,
						width: `${worker.timelineWidth}%`,
					}}
				/>
				{worker.status !== "completed" ? (
					<div className="absolute inset-y-[-3px] left-[75%] w-px bg-foreground/60">
						<span className="absolute -top-1 -left-0.5 size-1.5 rounded-full bg-foreground" />
					</div>
				) : null}
			</div>
		</div>
	);
}

function SummaryCard({
	title,
	value,
	detail,
	icon: Icon,
	emphasized = false,
}: {
	title: string;
	value: string;
	detail: string;
	icon: typeof Users;
	emphasized?: boolean;
}) {
	return (
		<Card
			className={cn(
				"gap-3 py-4 shadow-none",
				emphasized && "border-emerald-200 dark:border-emerald-900",
			)}
		>
			<CardContent className="flex items-start justify-between px-4">
				<div>
					<p className="text-xs font-medium text-muted-foreground">{title}</p>
					<p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
					<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
				</div>
				<span
					className={cn(
						"flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
						emphasized &&
							"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
					)}
				>
					<Icon className="size-4" />
				</span>
			</CardContent>
		</Card>
	);
}

export function SprinklerAttendanceDashboard() {
	const [selectedDate, setSelectedDate] = useState("2026-08-06");
	const [projectFilter, setProjectFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [search, setSearch] = useState("");

	const filteredWorkers = useMemo(() => {
		const query = search.trim().toLowerCase();
		return workers.filter((worker) => {
			const matchesProject =
				projectFilter === "all" || worker.project === projectFilter;
			const matchesStatus =
				statusFilter === "all" || worker.status === statusFilter;
			const matchesSearch =
				!query ||
				worker.name.toLowerCase().includes(query) ||
				worker.project.toLowerCase().includes(query) ||
				worker.location.toLowerCase().includes(query);
			return matchesProject && matchesStatus && matchesSearch;
		});
	}, [projectFilter, search, statusFilter]);

	const totalMinutes = workers.reduce(
		(total, worker) => total + worker.durationMinutes,
		0,
	);
	const totalHours = `${Math.floor(totalMinutes / 60)} st. ${totalMinutes % 60} min.`;

	return (
		<div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 pb-8">
			<header className="flex flex-col gap-5 rounded-xl border border-[#F26722]/25 border-t-4 border-t-[#F26722] bg-gradient-to-br from-white via-white to-[#F26722]/5 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:from-[#212529] dark:via-[#212529] dark:to-[#F26722]/10">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<a
						href="https://sprinkler.lv/lv/"
						target="_blank"
						rel="noreferrer"
						aria-label="Atvērt Sprinkler Service tīmekļvietni"
						className="flex w-fit shrink-0 items-center rounded-xl border border-[#F26722]/20 bg-white px-4 py-3 shadow-xs transition-shadow hover:shadow-sm"
					>
						<Image
							src="/logos/sprinkler-service.svg"
							alt="Sprinkler Service"
							width={154}
							height={54}
							priority
						/>
					</a>
					<div>
						<div className="mb-2 flex flex-wrap items-center gap-2">
							<Badge
								variant="outline"
								className="gap-1.5 border-[#F26722]/30 bg-white/80 py-1 dark:bg-[#212529]/80"
							>
								<WhatsAppIcon size={14} />
								WhatsApp darba laika uzskaite
							</Badge>
							<Badge className="border-[#F26722]/20 bg-[#F26722]/10 text-[#C64F18] dark:text-[#FF9A68]">
								Demonstrācijas dati
							</Badge>
						</div>
						<h1 className="text-2xl font-semibold tracking-tight text-[#212529] sm:text-3xl dark:text-white">
							Dienas darba laika uzskaite
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Skatiet, kur katrs darbinieks reģistrējās un cik ilgi strādāja.
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center rounded-md border border-[#F26722]/20 bg-background shadow-xs">
						<Button
							variant="ghost"
							size="icon"
							className="rounded-r-none border-r"
							aria-label="Iepriekšējā diena"
							onClick={() => setSelectedDate((date) => shiftDate(date, -1))}
						>
							<ChevronLeft />
						</Button>
						<div className="flex min-w-[190px] items-center justify-center gap-2 px-3 text-sm font-medium">
							<CalendarDays className="size-4 text-muted-foreground" />
							{formatDate(selectedDate)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-l-none border-l"
							aria-label="Nākamā diena"
							onClick={() => setSelectedDate((date) => shiftDate(date, 1))}
						>
							<ChevronRight />
						</Button>
					</div>
					<Button
						className="border-[#F26722] bg-[#F26722] text-white hover:border-[#D9571C] hover:bg-[#D9571C] hover:text-white"
						onClick={() => setSelectedDate("2026-08-06")}
					>
						Šodien
					</Button>
					<Button
						variant="outline"
						className="border-[#F26722]/40 text-[#C64F18] hover:bg-[#F26722]/10 hover:text-[#C64F18] dark:text-[#FF9A68]"
					>
						<ArrowDownToLine />
						Eksportēt
					</Button>
				</div>
			</header>

			<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Reģistrētie darbinieki"
					value="5"
					detail="3 aktīvajos projektos"
					icon={Users}
				/>
				<SummaryCard
					title="Šobrīd objektā"
					value="1"
					detail="Pēdējais atjauninājums plkst. 16.12"
					icon={CircleDot}
					emphasized
				/>
				<SummaryCard
					title="Uzskaitītais laiks"
					value={totalHours}
					detail="Vidēji 7 st. 28 min. vienam darbiniekam"
					icon={Clock3}
				/>
				<SummaryCard
					title="Jāpārbauda"
					value="1"
					detail="Nav darba beigu atzīmes"
					icon={AlertCircle}
				/>
			</section>

			<Tabs defaultValue="workers" className="gap-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<TabsList className="bg-[#212529]/6 dark:bg-white/8">
						<TabsTrigger
							value="workers"
							className="data-[state=active]:bg-[#F26722] data-[state=active]:text-white"
						>
							Darbinieki
						</TabsTrigger>
						<TabsTrigger
							value="projects"
							className="data-[state=active]:bg-[#F26722] data-[state=active]:text-white"
						>
							Projekti
						</TabsTrigger>
						<TabsTrigger
							value="map"
							className="data-[state=active]:bg-[#F26722] data-[state=active]:text-white"
						>
							<MapPinned />
							Karte
						</TabsTrigger>
					</TabsList>
					<div className="flex flex-col gap-2 sm:flex-row">
						<div className="relative sm:w-64">
							<Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Meklēt darbinieku vai vietu"
								className="pl-9"
							/>
						</div>
						<Select value={projectFilter} onValueChange={setProjectFilter}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue>
									{projectFilter === "all" ? "Visi projekti" : projectFilter}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Visi projekti</SelectItem>
								{projects.map((project) => (
									<SelectItem key={project.name} value={project.name}>
										{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full sm:w-44">
								<SelectValue>
									{statusFilter === "all"
										? "Visi statusi"
										: statusLabels[statusFilter as WorkerStatus]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Visi statusi</SelectItem>
								<SelectItem value="on-site">Objektā</SelectItem>
								<SelectItem value="completed">Pabeigts</SelectItem>
								<SelectItem value="attention">Jāpārbauda</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<TabsContent value="workers" className="mt-0">
					<div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
						<div className="space-y-3 md:hidden">
							{filteredWorkers.map((worker) => (
								<Card key={worker.id} className="gap-4 py-4 shadow-none">
									<CardContent className="px-4">
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#212529] text-xs font-semibold text-white">
													{worker.initials}
												</div>
												<div className="min-w-0">
													<p className="truncate font-medium">{worker.name}</p>
													<p className="text-xs text-muted-foreground">
														{worker.role}
													</p>
												</div>
											</div>
											<StatusBadge status={worker.status} />
										</div>

										<div className="mt-4 border-y py-3">
											<p className="text-sm font-medium">{worker.project}</p>
											<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
												<MapPin className="size-3" />
												{worker.location}
											</p>
										</div>

										<div className="grid grid-cols-3 gap-3 py-3 text-sm">
											<div>
												<p className="text-xs text-muted-foreground">
													Darba sākums
												</p>
												<p className="mt-1 font-mono font-medium">
													{worker.clockIn}
												</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">
													Darba beigas
												</p>
												<p
													className={cn(
														"mt-1 truncate font-mono font-medium",
														worker.status === "attention" &&
															"text-amber-700 dark:text-amber-300",
													)}
												>
													{worker.clockOut}
												</p>
											</div>
											<div className="text-right">
												<p className="text-xs text-muted-foreground">Ilgums</p>
												<p className="mt-1 font-mono font-semibold">
													{worker.duration}
												</p>
											</div>
										</div>

										<WorkerTimeline worker={worker} />
									</CardContent>
								</Card>
							))}
							{filteredWorkers.length === 0 ? (
								<Card className="py-10 text-center shadow-none">
									<p className="font-medium">Nav atrasts neviens ieraksts</p>
									<p className="text-sm text-muted-foreground">
										Mainiet atlasītos filtrus.
									</p>
								</Card>
							) : null}
						</div>

						<Card className="hidden gap-0 overflow-hidden py-0 shadow-none md:flex">
							<Table>
								<TableHeader>
									<TableRow className="bg-[#F26722]/6 hover:bg-[#F26722]/6 dark:bg-[#F26722]/10 dark:hover:bg-[#F26722]/10">
										<TableHead className="h-12 px-4">Darbinieks</TableHead>
										<TableHead>Projekts un vieta</TableHead>
										<TableHead>Sākums / beigas</TableHead>
										<TableHead className="min-w-[360px]">
											Dienas laika josla
										</TableHead>
										<TableHead className="pr-4 text-right">Ilgums</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredWorkers.map((worker) => (
										<TableRow key={worker.id}>
											<TableCell className="px-4 py-4">
												<div className="flex items-center gap-3">
													<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#212529] text-xs font-semibold text-white">
														{worker.initials}
													</div>
													<div>
														<p className="font-medium">{worker.name}</p>
														<p className="mt-0.5 text-xs text-muted-foreground">
															{worker.role}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<p className="font-medium">{worker.project}</p>
												<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
													<MapPin className="size-3" />
													{worker.location}
												</p>
											</TableCell>
											<TableCell>
												<div className="space-y-1 font-mono text-xs">
													<p>{worker.clockIn} sākums</p>
													<p
														className={
															worker.status === "attention"
																? "text-amber-700 dark:text-amber-300"
																: "text-muted-foreground"
														}
													>
														{worker.clockOut}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<WorkerTimeline worker={worker} />
											</TableCell>
											<TableCell className="pr-4 text-right">
												<p className="font-mono text-sm font-semibold">
													{worker.duration}
												</p>
												<div className="mt-1.5 flex justify-end">
													<StatusBadge status={worker.status} />
												</div>
											</TableCell>
										</TableRow>
									))}
									{filteredWorkers.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="h-36 text-center">
												<p className="font-medium">
													Nav atrasts neviens darba laika ieraksts
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Mainiet projektu, statusu vai meklējamo tekstu.
												</p>
											</TableCell>
										</TableRow>
									) : null}
								</TableBody>
							</Table>
						</Card>

						<Card className="gap-4 border-t-2 border-t-emerald-500 py-5 shadow-none">
							<CardHeader className="px-5">
								<div className="flex items-center justify-between gap-3">
									<div>
										<CardTitle className="text-base">
											WhatsApp aktivitātes
										</CardTitle>
										<CardDescription className="mt-1">
											Jaunākās darbinieku ziņas
										</CardDescription>
									</div>
									<WhatsAppIcon size={24} />
								</div>
							</CardHeader>
							<CardContent className="px-5">
								<div className="space-y-5">
									{activity.map((item, index) => (
										<div key={item.id} className="relative flex gap-3">
											{index < activity.length - 1 ? (
												<div className="absolute top-6 bottom-[-20px] left-[7px] w-px bg-border" />
											) : null}
											<span
												className={cn(
													"relative mt-1.5 size-3.5 shrink-0 rounded-full border-[3px] border-background ring-1",
													item.tone === "active"
														? "bg-emerald-500 ring-emerald-500"
														: "bg-muted-foreground ring-muted-foreground",
												)}
											/>
											<div className="min-w-0 flex-1">
												<div className="flex items-start justify-between gap-2">
													<p className="text-sm leading-5">
														<span className="font-medium">{item.worker}</span>{" "}
														<span className="text-muted-foreground">
															{item.action}
														</span>
													</p>
													<span className="font-mono text-xs text-muted-foreground">
														{item.time}
													</span>
												</div>
												<p className="mt-0.5 truncate text-xs text-muted-foreground">
													{item.project}
												</p>
											</div>
										</div>
									))}
								</div>
								<Button
									variant="ghost"
									className="mt-5 w-full border border-dashed text-muted-foreground"
								>
									Skatīt visus ziņojumus
								</Button>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="projects" className="mt-0">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{projects.map((project) => (
							<Card
								key={project.name}
								className="gap-4 border-t-2 border-t-[#F26722] py-5 shadow-none"
							>
								<CardHeader className="px-5">
									<div className="flex items-start justify-between gap-3">
										<span className="flex size-10 items-center justify-center rounded-lg bg-[#F26722]/10">
											<BriefcaseBusiness className="size-5 text-[#D9571C] dark:text-[#FF9A68]" />
										</span>
										<Badge variant="secondary">
											{project.workers}{" "}
											{project.workers === 1 ? "darbinieks" : "darbinieki"}
										</Badge>
									</div>
									<CardTitle className="mt-3 text-lg">{project.name}</CardTitle>
									<CardDescription className="flex items-center gap-1">
										<MapPin className="size-3.5" />
										{project.location}
									</CardDescription>
								</CardHeader>
								<CardContent className="px-5">
									<div className="flex items-end justify-between">
										<div>
											<p className="text-xs text-muted-foreground">
												Šodien uzskaitīts
											</p>
											<p className="mt-1 font-mono text-xl font-semibold">
												{project.hours}
											</p>
										</div>
										<span className="text-xs font-medium text-muted-foreground">
											{project.share}% no kopējā laika
										</span>
									</div>
									<div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-[#F26722]"
											style={{ width: `${project.share}%` }}
										/>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="map" className="mt-0">
					<SprinklerWorkerMap workers={filteredWorkers} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
