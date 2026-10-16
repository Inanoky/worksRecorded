"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";

type Status = FimaCollaboration["status"];
type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};
export function useFimaReviewStatus({
	siteId,
	recordId,
	state,
	onChange,
}: Props) {
	const confirmed = useRef(state);
	const queue = useRef<{ status: Status; requestId: string }[]>([]);
	const running = useRef(false);
	const recovering = useRef(false);
	const mounted = useRef(true);
	const callback = useRef(onChange);
	const [pending, setPending] = useState<{ status: Status } | null>(null);
	const [saving, setSaving] = useState(false);
	const [reloading, setReloading] = useState(false);
	useEffect(() => {
		callback.current = onChange;
		if (state.version >= confirmed.current.version) confirmed.current = state;
	}, [onChange, state]);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const selectStatus = (status: Status) => {
		if (recovering.current) return;
		const latest = queue.current.length
			? queue.current[queue.current.length - 1].status
			: confirmed.current.status;
		if (status === latest) return;
		queue.current.push({ status, requestId: crypto.randomUUID() });
		setPending({ status });
		setSaving(true);
		if (running.current) return;
		running.current = true;
		void (async () => {
			try {
				while (queue.current.length) {
					const job = queue.current[0];
					try {
						const saved = await saveFimaDiaryCollaboration({
							siteId,
							recordId,
							kind: "status",
							status: job.status,
							requestId: job.requestId,
							expectedVersion: confirmed.current.version,
						});
						if (saved.version >= confirmed.current.version)
							confirmed.current = saved;
						if (mounted.current) callback.current(recordId, confirmed.current);
						queue.current.shift();
					} catch (error) {
						queue.current = [];
						recovering.current = true;
						if (mounted.current) {
							setPending(null);
							setReloading(true);
							toast.error(
								error instanceof Error
									? error.message
									: "Neizdevās saglabāt rīcību. Atjaunota iepriekšējā atzīme.",
							);
						}
						try {
							const latestState = await getFimaDiaryCollaboration({
								siteId,
								recordId,
							});
							if (latestState.version >= confirmed.current.version)
								confirmed.current = latestState;
							if (mounted.current)
								callback.current(recordId, confirmed.current);
						} catch {
							if (mounted.current)
								callback.current(recordId, confirmed.current);
						} finally {
							recovering.current = false;
							if (mounted.current) setReloading(false);
						}
						break;
					}
				}
			} finally {
				running.current = false;
				if (mounted.current) {
					setPending(null);
					setSaving(false);
				}
			}
		})();
	};
	return {
		status: pending
			? pending.status
			: state.version >= confirmed.current.version
				? state.status
				: confirmed.current.status,
		selectStatus,
		saving,
		recovering: reloading,
	};
}
