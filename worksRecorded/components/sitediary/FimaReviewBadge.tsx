"use client";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { FimaBadgeHistory } from "./FimaBadgeHistory";
import { FimaStatusSelect } from "./FimaStatusSelect";
import { useFimaReviewStatus } from "./useFimaReviewStatus";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};
export function FimaReviewBadge(props: Props) {
	const { status, selectStatus, saving, recovering } =
		useFimaReviewStatus(props);
	return (
		<FimaStatusSelect
			status={status}
			selectStatus={selectStatus}
			saving={saving}
			disabled={recovering}
			actor={props.state.history.findLast((event) => event.kind === "status")}
			history={
				<FimaBadgeHistory
					key={`${props.siteId}:${props.recordId}`}
					{...props}
				/>
			}
		/>
	);
}
