import type { ZtcProjectTaskRates } from "@/flows/ztc-production/backend/actions";
import type { ZtcPersistentCache } from "@/flows/ztc-production/lib/ztc-persistent-cache";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import type {
	ZtcWorkspaceData,
	ZtcWorkspaceResult,
} from "@/flows/ztc-production/lib/ztc-workspace-data";

type State = {
	data: ZtcWorkspaceData | null;
	hydrating: boolean;
	refreshing: boolean;
	error: string | null;
	denied: boolean;
};

export class ZtcWorkspaceResource {
	private state: State = {
		data: null,
		hydrating: true,
		refreshing: false,
		error: null,
		denied: false,
	};
	private listeners = new Set<() => void>();
	private generation = 0;
	private hydrated = false;
	private request: Promise<ZtcWorkspaceData> | null = null;
	private writes = Promise.resolve();

	constructor(
		private readonly siteId: string,
		private readonly storage: Pick<
			ZtcPersistentCache,
			"read" | "write" | "clear"
		>,
		private readonly load: () => Promise<ZtcWorkspaceResult>,
		private readonly loadMedia: () => Promise<
			ZtcWorkspaceData["mediaOnlyDays"]
		>,
	) {}

	getSnapshot = () => this.state;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	private publish(patch: Partial<State>) {
		this.state = { ...this.state, ...patch };
		for (const listener of this.listeners) listener();
	}
	private persist(data: ZtcWorkspaceData) {
		const generation = this.generation;
		this.writes = this.writes
			.then(() =>
				generation === this.generation ? this.storage.write(data) : undefined,
			)
			.catch(() => {});
	}

	async hydrate() {
		if (this.hydrated) return;
		this.hydrated = true;
		const generation = this.generation;
		try {
			const data = await this.storage.read();
			if (
				generation === this.generation &&
				!this.state.data &&
				!this.state.denied &&
				data?.siteId === this.siteId
			) {
				this.publish({ data });
			}
		} finally {
			if (generation === this.generation) this.publish({ hydrating: false });
		}
	}

	refresh = (): Promise<ZtcWorkspaceData> => {
		if (this.request) return this.request;
		const generation = this.generation;
		this.publish({ refreshing: true, error: null });
		const request: Promise<ZtcWorkspaceData> = Promise.resolve().then(
			async () => {
				try {
					const result = await this.load();
					if (result.status === "denied") {
						if (generation === this.generation) {
							this.invalidate();
							this.publish({ data: null, denied: true });
						}
						throw new Error("Jums nav piekļuves ražošanas žurnālam.");
					}
					const data: ZtcWorkspaceData = {
						...result.data,
						mediaOnlyDays: this.state.data?.mediaOnlyDays ?? [],
					};
					if (data.siteId !== this.siteId)
						throw new Error("Neatbilstošs ražošanas objekts.");
					if (generation === this.generation) {
						this.publish({ data, error: null, denied: false });
						this.persist(data);
						void this.loadMedia()
							.then((mediaOnlyDays) => {
								if (generation !== this.generation || this.state.data !== data)
									return;
								const updated = { ...data, mediaOnlyDays };
								this.publish({ data: updated });
								this.persist(updated);
							})
							.catch(() => {});
					}
					return data;
				} catch (error) {
					if (generation === this.generation || this.state.denied)
						this.publish({
							error:
								error instanceof Error
									? error.message
									: "Neizdevās atjaunot ražošanas žurnālu.",
						});
					throw error;
				} finally {
					if (this.request === request) {
						this.request = null;
						this.publish({ refreshing: false });
					}
				}
			},
		);
		this.request = request;
		return request;
	};

	invalidate = () => {
		this.generation++;
		this.request = null;
		this.writes = this.writes.then(() => this.storage.clear()).catch(() => {});
		this.publish({ refreshing: false });
	};

	release = () => {
		this.generation++;
		this.request = null;
		this.hydrated = false;
		this.publish({ refreshing: false });
	};

	updateRates = (rates: ZtcProjectTaskRates[]) => {
		if (!this.state.data) return;
		this.invalidate();
		const data = {
			...this.state.data,
			rates,
			config: {
				...this.state.data.config,
				otherSettings: {
					...(this.state.data.config.otherSettings as Record<string, unknown>),
					ztcDefaultTaskRates: { projects: rates },
				},
			},
		};
		this.publish({ data });
		this.persist(data);
	};

	updatePayroll = (
		id: string,
		values: Pick<
			ZtcDiaryRow,
			"Location_Custom_2" | "Works_Custom_2" | "WorkersInvolved"
		>,
	) => {
		if (!this.state.data) return;
		this.invalidate();
		const data = {
			...this.state.data,
			rows: this.state.data.rows.map((row) =>
				row.id === id ? { ...row, ...values } : row,
			),
		};
		this.publish({ data });
		this.persist(data);
	};
}
