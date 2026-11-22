import type { Forma2ActAssignment } from "@/flows/default-construction/lib/forma2-act-coverage";
import type { FimaForma2Workspace } from "@/flows/default-construction/lib/forma2-results";
import type { FimaResourcePersistence } from "./persistent-resource";

type Snapshot = { data: FimaForma2Workspace; etag: string };
type State = {
	status: "idle" | "loading" | "ready" | "error";
	snapshot: Snapshot | null;
	error: string;
};

export function createFimaForma2Resource(
	loadView: () => Promise<unknown>,
	persistence?: (siteId: string) => FimaResourcePersistence<Snapshot>,
	request: typeof fetch = (...args) => fetch(...args),
) {
	const empty: State = { status: "idle", snapshot: null, error: "" };
	const states = new Map<string, State>();
	const pending = new Map<string, Promise<void>>();
	const listeners = new Set<() => void>();
	const edits = new Map<string, number>();
	const get = (siteId: string) => states.get(siteId) ?? empty;
	const publish = (siteId: string, state: State) => {
		states.set(siteId, state);
		for (const notify of listeners) notify();
	};
	const save = (siteId: string, snapshot: Snapshot | null) => {
		void persistence?.(siteId)
			.write(snapshot)
			.catch(() => {});
	};
	const ready = (siteId: string, snapshot: Snapshot) => {
		publish(siteId, { status: "ready", snapshot, error: "" });
		save(siteId, snapshot);
	};
	const load = (siteId: string) => {
		const running = pending.get(siteId);
		if (running) return running;
		let snapshot = get(siteId).snapshot;
		const before = edits.get(siteId) ?? 0;
		if (!snapshot) publish(siteId, { ...empty, status: "loading" });
		const work = (async () => {
			const view = loadView();
			if (!snapshot && persistence) {
				const cached = await persistence(siteId)
					.read()
					.catch(() => undefined);
				if (cached?.data.siteId === siteId) {
					snapshot = cached;
					publish(siteId, { status: "ready", snapshot, error: "" });
				}
			}
			const [response] = await Promise.all([
				request(
					`/api/fima/project-forma2?project=${encodeURIComponent(siteId)}`,
					{
						cache: "no-store",
						headers: snapshot?.etag ? { "If-None-Match": snapshot.etag } : {},
					},
				),
				view,
			]);
			if (response.status === 401 || response.status === 403) {
				save(siteId, null);
				publish(siteId, {
					status: "error",
					snapshot: null,
					error: "Piekļuve projektam ir mainīta. Atveriet projektu no jauna.",
				});
				return;
			}
			if ((edits.get(siteId) ?? 0) !== before) return;
			if (response.status === 304 && snapshot) {
				if (get(siteId).status !== "ready") ready(siteId, snapshot);
				return;
			}
			if (!response.ok) throw new Error("Neizdevās ielādēt Forma 2.");
			const data = (await response.json()) as FimaForma2Workspace;
			if (data.siteId !== siteId)
				throw new Error("Saņemti cita projekta dati.");
			if ((edits.get(siteId) ?? 0) === before)
				ready(siteId, { data, etag: response.headers.get("etag") ?? "" });
		})()
			.catch(() =>
				publish(siteId, {
					status: "error",
					snapshot: get(siteId).snapshot,
					error: "Neizdevās ielādēt Forma 2.",
				}),
			)
			.finally(() => pending.delete(siteId));
		pending.set(siteId, work);
		return work;
	};
	return {
		subscribe(notify: () => void) {
			listeners.add(notify);
			return () => {
				listeners.delete(notify);
			};
		},
		get,
		empty: () => empty,
		load,
		async refresh(siteId: string) {
			await pending.get(siteId);
			await load(siteId);
		},
		patchAssignments(
			siteId: string,
			update: {
				caseId: string;
				documentId: string;
				assignments: Forma2ActAssignment[];
			},
		) {
			const snapshot = get(siteId).snapshot;
			const coverage = snapshot?.data.input.actCoverage;
			if (
				!snapshot ||
				coverage?.caseId !== update.caseId ||
				coverage.documentId !== update.documentId
			)
				return;
			edits.set(siteId, (edits.get(siteId) ?? 0) + 1);
			const { data } = snapshot;
			ready(siteId, {
				...snapshot,
				data: {
					...data,
					input: {
						...data.input,
						actCoverage: { ...coverage, assignments: update.assignments },
					},
				},
			});
		},
	};
}
