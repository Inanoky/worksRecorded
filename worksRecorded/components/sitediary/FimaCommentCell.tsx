"use client";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { saveFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";
import { FimaCommentControl } from "./FimaCommentControl";
export function FimaCommentCell({
	siteId,
	recordId,
	state,
	onOpenRecord,
	onChange,
}: {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onOpenRecord: () => void;
	onChange: (id: string, state: FimaCollaboration) => void;
}) {
	return (
		<FimaCommentControl
			history={state.history}
			onOpenRecord={onOpenRecord}
			onSave={async (text, requestId) => {
				const result = await saveFimaDiaryCollaboration({
					siteId,
					recordId,
					kind: "comment",
					text,
					requestId,
				});
				onChange(recordId, result);
			}}
		/>
	);
}
