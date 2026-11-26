"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
	defaultProdevBisReview,
	type ProdevBisReview,
	type ProdevBisReviewStatus,
	prodevBisReviewLabels,
} from "@/lib/site-diary/prodev-bis-review";
import {
	getProdevBisReview,
	saveProdevBisReview,
} from "@/server/actions/prodev-bis-review";
import { DiaryBadgeHistory } from "./FimaBadgeHistory";
import { DiaryStatusSelect } from "./FimaStatusSelect";

const tones = {
	do_not_send: "border-red-200 bg-red-50 text-red-700",
	send_to_bis: "border-[#B8E0C6] bg-[#ECF8F0] text-[#159447]",
};

export function ProdevBisReviewBadge({
	siteId,
	recordId,
	state = defaultProdevBisReview,
	onChange,
}: {
	siteId: string;
	recordId: string;
	state?: ProdevBisReview;
	onChange: (recordId: string, state: ProdevBisReview) => void;
}) {
	const [pending, setPending] = useState<ProdevBisReviewStatus | null>(null);
	const change = async (status: ProdevBisReviewStatus) => {
		if (pending || status === state.status) return;
		setPending(status);
		try {
			const confirmed = await saveProdevBisReview({
				siteId,
				recordId,
				requestId: crypto.randomUUID(),
				status,
				expectedVersion: state.version,
			});
			onChange(recordId, confirmed);
		} catch {
			toast.error("Neizdevās saglabāt BIS atzīmi. Mēģiniet vēlreiz.");
			try {
				onChange(recordId, await getProdevBisReview({ siteId, recordId }));
			} catch {}
		} finally {
			setPending(null);
		}
	};
	return (
		<DiaryStatusSelect
			status={pending ?? state.status}
			selectStatus={change}
			choices={prodevBisReviewLabels}
			tones={tones}
			saving={pending !== null}
			disabled={pending !== null}
			label="Nosūtīšanas atzīme"
			actor={state.history.at(-1)}
			history={
				<DiaryBadgeHistory
					history={state.history.map((event) => ({
						...event,
						text: `${prodevBisReviewLabels[event.from]} → ${prodevBisReviewLabels[event.to]}`,
					}))}
				/>
			}
		/>
	);
}
