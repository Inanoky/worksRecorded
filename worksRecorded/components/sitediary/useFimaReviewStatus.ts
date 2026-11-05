"use client";

import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { useFimaDiaryChoice } from "./useFimaDiaryChoice";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};

export function useFimaReviewStatus(props: Props) {
	const { value, selectValue, ...result } = useFimaDiaryChoice({
		...props,
		field: "status",
	});
	return {
		...result,
		status: value as FimaCollaboration["status"],
		selectStatus: (status: FimaCollaboration["status"]) => selectValue(status),
	};
}
