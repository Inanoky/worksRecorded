"use client";
import { useCallback } from "react";
import {
	type FimaCollaboration,
	formatFimaEventText,
} from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { FimaHistoryControl } from "./FimaHistoryControl";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
	draft?: string;
	onDraftChange?: (value: string) => void;
};
export function FimaRecordHistory({
	siteId,
	recordId,
	state,
	onChange,
	draft,
	onDraftChange,
}: Props) {
	const refresh = useCallback(async () => {
		onChange(recordId, await getFimaDiaryCollaboration({ siteId, recordId }));
	}, [siteId, recordId, onChange]);
	const save = async (text: string, requestId: string) => {
		onChange(
			recordId,
			await saveFimaDiaryCollaboration({
				siteId,
				recordId,
				kind: "comment",
				text,
				requestId,
			}),
		);
	};
	return (
		<FimaHistoryControl
			history={state.history.map((event) => ({
				...event,
				text: formatFimaEventText(event),
			}))}
			onRefresh={refresh}
			onSave={save}
			draft={draft}
			onDraftChange={onDraftChange}
		/>
	);
}
