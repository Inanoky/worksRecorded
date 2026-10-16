"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { refreshFimaBisMaterials } from "@/server/actions/fima-diary-collaboration";

type Row = {
	id?: string;
	siteId?: string | null;
	BISId?: string | null;
	hasFimaBisReferences?: boolean;
	fimaBisRecords?: { id: string; number: string | null }[];
	fimaCollaboration?: FimaCollaboration;
};
type Props = {
	records: Row[];
	siteId?: string;
	onChange: (id: string, state: FimaCollaboration) => void;
};
const freshFor = 10 * 60 * 1000;

export function FimaMaterialRefresh({ records, siteId, onChange }: Props) {
	const latest = useRef(records);
	const pending = useRef(new Map<string, Promise<FimaCollaboration>>());
	const [revision, setRevision] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const linked = records.filter(
		(row) =>
			row.id &&
			(row.siteId || siteId) &&
			(row.BISId || row.hasFimaBisReferences),
	);
	const scopeKey = linked
		.map((row) => `${row.siteId || siteId}:${row.id}:${row.BISId ?? ""}`)
		.join("|");
	useEffect(() => {
		latest.current = records;
	}, [records]);
	useEffect(() => {
		setLoading(false);
		setError("");
		if (!scopeKey) return;
		let active = true;
		let stopped = false;
		const candidates = latest.current.filter((row) => {
			if (
				!row.id ||
				!(row.siteId || siteId) ||
				!(row.BISId || row.hasFimaBisReferences)
			)
				return false;
			const snapshot = row.fimaCollaboration?.bisMaterials;
			return (
				revision > 0 ||
				Boolean(
					row.fimaBisRecords?.some(
						(record) =>
							!record.number &&
							!snapshot?.entries.some(
								(entry) => entry.bisId === record.id && entry.number,
							),
					),
				) ||
				!snapshot ||
				Date.now() - Date.parse(snapshot.fetchedAt) > freshFor ||
				!Number.isFinite(Date.parse(snapshot.fetchedAt)) ||
				Boolean(
					row.BISId &&
						!snapshot.entries.some((entry) => entry.bisId === row.BISId),
				)
			);
		});
		if (!candidates.length) return;
		setLoading(true);
		setError("");
		let index = 0;
		const worker = async () => {
			while (active && !stopped && index < candidates.length) {
				const row = candidates[index++];
				const projectId = row.siteId || siteId;
				if (!row.id || !projectId) continue;
				const key = `${projectId}:${row.id}`;
				let request = pending.current.get(key);
				if (!request) {
					request = refreshFimaBisMaterials({
						siteId: projectId,
						recordId: row.id,
					}).finally(() => pending.current.delete(key));
					pending.current.set(key, request);
				}
				try {
					const result = await request;
					if (active) onChange(row.id, result);
				} catch (cause) {
					stopped = true;
					if (active)
						setError(
							cause instanceof Error
								? cause.message
								: "Neizdevās atjaunot ierakstu materiālus no BIS.",
						);
				}
			}
		};
		void Promise.all([worker(), worker()]).finally(() => {
			if (active) setLoading(false);
		});
		return () => {
			active = false;
		};
	}, [scopeKey, revision, siteId, onChange]);
	if (!linked.length) return null;
	return (
		<div className="mb-3 flex flex-wrap items-center gap-3">
			<Button
				size="sm"
				variant="outline"
				disabled={loading}
				onClick={() => setRevision((value) => value + 1)}
			>
				{loading
					? "Atjauno ierakstu materiālus..."
					: "Atjaunot ierakstu materiālus no BIS"}
			</Button>
			{error ? (
				<p role="alert" className="text-xs text-destructive">
					{error} Iepriekš saglabātie dati nav mainīti.
				</p>
			) : null}
		</div>
	);
}
