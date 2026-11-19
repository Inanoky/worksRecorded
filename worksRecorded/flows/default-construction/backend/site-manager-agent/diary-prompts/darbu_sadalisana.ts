import { DIARY_WORK_SPLIT_POLICY } from "../diarySourcePolicy";
import type { DiaryPromptSection } from "./types";

export function darbu_sadalisana(): DiaryPromptSection {
	return {
		id: "darbu_sadalisana",
		title: "Atsevišķi darbi un apakšdarbības",
		description:
			"Nošķir patstāvīgus darbus, piegādi un iestrādi; nesadala viena darba tehniku un saistītās apakšdarbības.",
		version: 1,
		text: `${DIARY_WORK_SPLIT_POLICY}
Judge whether the proposed rows represent real separate diary events/jobs from the original WhatsApp message.
Return verdict=needs_model_repair when one real job was split into artificial rows, when machinery/tools/operators/sub-actions were turned into separate jobs, when shared workers/hours/quantity were split without source evidence, or when the original message clearly contains multiple distinct source-backed diary events/jobs but the proposed output merged them into one broad row.
Shared workers or total hours never justify merging distinct completed works. Split independently described works even if some quantities or labour allocations are unknown. Keep an unallocated shared team/duration once in a separate labour note with null Amounts/Units and null labour on the work rows. A vague list without distinct completed activities may remain one summary note.
Return verdict=needs_model_repair when one actor or one machine performing conjoined in-progress sub-actions in a single sentence is split into separate rows. For example, "No plkst. 15.00 Agris ar ekskavatoru veic zemes noņemšanu un šķembošanu" should be one note/work row with both actions in Comments, expectedRecordCount=1, and no TimeInvolved inferred from the start time.
Shared duration or worker count does not justify merging material delivery with actual installed/placed work when the source gives separate action+quantity evidence for each, such as "ievesta smilts 160m3" and "iestrādāti 140m3". If a proposed row merges those into one broad row, return verdict=needs_model_repair with expectedRecordCount=2 and instruct the extractor to create one Material delivery row for the delivered quantity and one work row for the installed/placed quantity.
Do not reject merely because there are many rows. Full-day reports can legitimately create many rows when each row has distinct source evidence.`,
	};
}
