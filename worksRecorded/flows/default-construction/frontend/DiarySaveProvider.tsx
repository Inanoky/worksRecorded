"use client";

import { Check, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { saveDefaultConstructionDiaryEdits } from "../backend/diary-edit-actions";
import {
	DiarySaveQueue,
	type DiarySaveSnapshot,
} from "../lib/diary-save-queue";

const emptySnapshot: DiarySaveSnapshot = {
	items: [],
	savingId: null,
	error: null,
	lastSavedAt: null,
	confirmed: { rows: [], createdIds: [] },
	confirmedRevisions: {},
	revision: 0,
};
const subscribeEmpty = () => () => {};
const getEmpty = () => emptySnapshot;
const Context = createContext<
	((siteId: string) => DiarySaveQueue | null) | null
>(null);

function SaveStatus({
	queue,
	name,
	language,
	siteId,
}: {
	queue: DiarySaveQueue;
	name: string;
	language: string | null;
	siteId: string;
}) {
	const snapshot = useSyncExternalStore(
		queue.subscribe,
		queue.getSnapshot,
		getEmpty,
	);
	const en = language === "en";
	const failure =
		snapshot.error ?? snapshot.items.find((item) => item.error)?.error;
	const [dismissedSavedAt, setDismissedSavedAt] = useState<number | null>(null);
	useEffect(() => {
		if (!snapshot.lastSavedAt || snapshot.items.length) return;
		const timer = window.setTimeout(
			() => setDismissedSavedAt(snapshot.lastSavedAt),
			6000,
		);
		return () => window.clearTimeout(timer);
	}, [snapshot.lastSavedAt, snapshot.items.length]);
	if (!snapshot.items.length && !failure && !snapshot.lastSavedAt) return null;
	if (
		!snapshot.items.length &&
		!failure &&
		snapshot.lastSavedAt === dismissedSavedAt
	)
		return null;
	return (
		<div className="max-w-md rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
			<output aria-live="polite" className="flex items-center gap-2">
				{failure ? (
					<TriangleAlert className="size-4 shrink-0 text-destructive" />
				) : snapshot.items.length ? (
					<Loader2 className="size-4 shrink-0 animate-spin" />
				) : (
					<Check className="size-4 shrink-0 text-green-600" />
				)}
				<span className="min-w-0 truncate">
					{name}:{" "}
					{failure
						? en
							? "Not saved to server"
							: "Nav saglabāts serverī"
						: snapshot.items.length
							? `${en ? "Saving" : "Saglabā"}… (${snapshot.items.length})`
							: en
								? "Saved"
								: "Saglabāts"}
				</span>
			</output>
			{failure ? (
				<>
					<p className="mt-2 text-muted-foreground">{failure}</p>
					<p className="mt-1 text-muted-foreground">
						{en
							? "Edits remain in this browser."
							: "Izmaiņas paliek šajā pārlūkā."}
					</p>
					<div className="mt-2 flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={!!snapshot.savingId}
							onClick={queue.retry}
						>
							{en ? "Retry" : "Mēģināt vēlreiz"}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							disabled={!!snapshot.savingId}
							onClick={() => {
								if (
									window.confirm(
										en
											? "Discard pending local edits? Saved records will not be deleted."
											: "Atcelt gaidošās lokālās izmaiņas? Saglabātie ieraksti netiks dzēsti.",
									)
								) {
									queue.discard();
									window.dispatchEvent(
										new Event("construction-diary-queue-discarded"),
									);
								}
							}}
						>
							{en ? "Discard local edits" : "Atcelt lokālās izmaiņas"}
						</Button>
					</div>
					<Link
						className="mt-2 block underline"
						href={`/dashboard/sites/${siteId}/dashboard`}
					>
						{en ? "Open diary" : "Atvērt žurnālu"}
					</Link>
				</>
			) : null}
		</div>
	);
}

export function DiarySaveProvider({
	children,
	userId,
	projects,
	language,
}: {
	children: ReactNode;
	userId: string;
	projects: { id: string; name: string; organizationId: string | null }[];
	language: string | null;
}) {
	const [queues, setQueues] = useState<DiarySaveQueue[]>([]);
	const projectKey = JSON.stringify(projects);
	const manager = useMemo(() => {
		const byId = new Map<string, DiarySaveQueue>();
		const scopedProjects = JSON.parse(projectKey) as typeof projects;
		const sites = new Map(
			scopedProjects.map((project) => [project.id, project]),
		);
		return {
			byId,
			projects: scopedProjects,
			get: (siteId: string) => {
				const site = sites.get(siteId);
				if (!site?.organizationId) return null;
				let queue = byId.get(siteId);
				if (!queue) {
					queue = new DiarySaveQueue({
						siteId,
						scope: `${userId}:${site.organizationId}`,
						save: saveDefaultConstructionDiaryEdits,
						lock: async (run) => {
							if (navigator.locks)
								await navigator.locks.request(
									`diary-save:${userId}:${site.organizationId}:${siteId}`,
									run,
								);
							else await run();
						},
					});
					byId.set(siteId, queue);
				}
				return queue;
			},
		};
	}, [userId, projectKey]);

	useEffect(() => {
		const attach = () => {
			try {
				for (const project of manager.projects) {
					const prefix = `construction-diary-save:v1:${userId}:${project.organizationId}:${project.id}:`;
					for (let i = 0; i < localStorage.length; i++) {
						if (localStorage.key(i)?.startsWith(prefix)) {
							manager.get(project.id);
							break;
						}
					}
				}
				for (const queue of manager.byId.values()) queue.attach(localStorage);
			} catch {}
			setQueues([...manager.byId.values()]);
		};
		attach();
		window.addEventListener("construction-diary-queue-created", attach);
		const storageChanged = (event: StorageEvent) => {
			if (event.key?.startsWith(`construction-diary-save:v1:${userId}:`))
				attach();
		};
		window.addEventListener("storage", storageChanged);
		const unload = (event: BeforeUnloadEvent) => {
			if (
				[...manager.byId.values()].some(
					(queue) => queue.getSnapshot().items.length,
				)
			) {
				event.preventDefault();
				event.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", unload);
		return () => {
			for (const queue of manager.byId.values()) queue.detach();
			window.removeEventListener("construction-diary-queue-created", attach);
			window.removeEventListener("storage", storageChanged);
			window.removeEventListener("beforeunload", unload);
		};
	}, [manager, userId]);
	return (
		<Context.Provider value={manager.get}>
			{children}
			<section
				className="fixed bottom-4 right-4 z-40 flex max-h-[40vh] flex-col gap-2 overflow-y-auto"
				aria-label={
					language === "en" ? "Diary save status" : "Žurnāla saglabāšana"
				}
			>
				{queues.map((queue) => {
					const project = projects.find((project) =>
						queue.prefix.includes(`:${project.id}:`),
					);
					return (
						<SaveStatus
							key={queue.prefix}
							queue={queue}
							name={project?.name ?? "Žurnāls"}
							language={language}
							siteId={project?.id ?? ""}
						/>
					);
				})}
			</section>
		</Context.Provider>
	);
}

export function useDiarySaveQueue(siteId: string | null, enabled: boolean) {
	const get = useContext(Context);
	const queue = useMemo(
		() => (enabled && siteId ? (get?.(siteId) ?? null) : null),
		[get, siteId, enabled],
	);
	const snapshot = useSyncExternalStore(
		queue?.subscribe ?? subscribeEmpty,
		queue?.getSnapshot ?? getEmpty,
		getEmpty,
	);
	useEffect(() => {
		if (queue)
			window.dispatchEvent(new Event("construction-diary-queue-created"));
	}, [queue]);
	return { queue, snapshot };
}
