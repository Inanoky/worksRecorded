"use client";
import { useCallback } from "react";
import { FimaHistoryControl } from "@/components/sitediary/FimaHistoryControl";
import { FimaReviewPanel } from "@/components/sitediary/FimaReviewPanel";
import { getFimaAcceptanceActUrl } from "@/lib/fima/acceptance-acts";
import type { FimaActRow, FimaActSetting } from "@/lib/fima/act-register";
import {
	getFimaActSetting,
	saveFimaActSettings,
} from "@/server/actions/fima-acts";
export function FimaActCommentsPanel({
	row,
	onClose,
	onRestoreFocus,
	onSaved,
	draft,
	onDraftChange,
}: {
	row: FimaActRow | null;
	onClose: () => void;
	onRestoreFocus: () => void;
	onSaved: (key: string, setting: FimaActSetting) => void;
	draft: string;
	onDraftChange: (value: string) => void;
}) {
	return (
		<FimaReviewPanel
			open={!!row}
			title="Akta pārskats"
			description={`${row?.localNumber ?? ""} · komentāru un atzīmju vēsture.`}
			onClose={onClose}
			onRestoreFocus={onRestoreFocus}
		>
			{row ? (
				<>
					<section className="space-y-3 rounded-lg border bg-muted/20 p-4">
						<h2 className="text-sm font-semibold">
							{row.number ?? row.localNumber}
						</h2>
						<p className="whitespace-pre-wrap break-words text-sm">
							{row.title}
						</p>
						<a
							className="text-sm text-primary underline"
							href={
								getFimaAcceptanceActUrl(row.collection, row.id) ?? undefined
							}
							target="_blank"
							rel="noopener noreferrer"
						>
							Atvērt BIS ierakstu
						</a>
					</section>
					<ActHistory
						key={row.key}
						row={row}
						onSaved={onSaved}
						draft={draft}
						onDraftChange={onDraftChange}
					/>
				</>
			) : null}
		</FimaReviewPanel>
	);
}

function ActHistory({
	row,
	onSaved,
	draft,
	onDraftChange,
}: {
	row: FimaActRow;
	onSaved: (key: string, setting: FimaActSetting) => void;
	draft: string;
	onDraftChange: (value: string) => void;
}) {
	const refresh = useCallback(async () => {
		onSaved(
			row.key,
			await getFimaActSetting({
				siteId: row.siteId,
				collection: row.collection,
				id: row.id,
			}),
		);
	}, [row.siteId, row.collection, row.id, row.key, onSaved]);
	const save = async (text: string, requestId: string) => {
		onSaved(
			row.key,
			await saveFimaActSettings({
				siteId: row.siteId,
				collection: row.collection,
				id: row.id,
				expectedRevision: row.setting.revision,
				kind: "comment",
				text,
				requestId,
			}),
		);
	};
	return (
		<FimaHistoryControl
			history={row.setting.history}
			onRefresh={refresh}
			onSave={save}
			draft={draft}
			onDraftChange={onDraftChange}
		/>
	);
}
