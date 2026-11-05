"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FimaActType } from "@/lib/fima/act-types";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";

type Choice = FimaCollaboration["status"] | FimaActType | null;
type ChoiceField = "status" | "actType";
type Props = {
	field: ChoiceField;
	fallback?: Choice;
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};
export function useFimaDiaryChoice({
	field,
	fallback = null,
	siteId,
	recordId,
	state,
	onChange,
}: Props) {
	const confirmed = useRef(state);
	const queue = useRef<{ value: Choice; requestId: string }[]>([]);
	const running = useRef(false);
	const recovering = useRef(false);
	const mounted = useRef(true);
	const callback = useRef(onChange);
	const [settled, setSettled] = useState(state);
	const [pending, setPending] = useState<{ value: Choice } | null>(null);
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
	const readValue = (value: FimaCollaboration) =>
		value[field] === undefined ? fallback : (value[field] ?? null);
	const selectValue = (value: Choice) => {
		if (recovering.current) return;
		const latest = queue.current.length
			? queue.current[queue.current.length - 1].value
			: readValue(confirmed.current);
		if (value === latest) return;
		queue.current.push({ value, requestId: crypto.randomUUID() });
		setPending({ value });
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
							...(field === "status"
								? {
										kind: "status" as const,
										status: job.value as FimaCollaboration["status"],
									}
								: {
										kind: "act_type" as const,
										actType: job.value as FimaActType | null,
									}),
							requestId: job.requestId,
							expectedVersion: confirmed.current.version,
						});
						if (saved.version >= confirmed.current.version)
							confirmed.current = saved;
						if (mounted.current) {
							setSettled(confirmed.current);
							callback.current(recordId, confirmed.current);
						}
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
									: "Neizdevās saglabāt izvēli. Atjaunota iepriekšējā vērtība.",
							);
						}
						try {
							const latestState = await getFimaDiaryCollaboration({
								siteId,
								recordId,
							});
							if (latestState.version >= confirmed.current.version)
								confirmed.current = latestState;
							if (mounted.current) {
								setSettled(confirmed.current);
								callback.current(recordId, confirmed.current);
							}
						} catch {
							if (mounted.current) {
								setSettled(confirmed.current);
								callback.current(recordId, confirmed.current);
							}
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
		value: pending
			? pending.value
			: state.version >= settled.version
				? readValue(state)
				: readValue(settled),
		selectValue,
		saving,
		recovering: reloading,
	};
}
