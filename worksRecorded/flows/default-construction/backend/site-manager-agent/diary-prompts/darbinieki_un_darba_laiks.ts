import type { DiaryPromptSection } from "./types";

export function darbinieki_un_darba_laiks(): DiaryPromptSection {
	return {
		id: "darbinieki_un_darba_laiks",
		title: "Darbinieki un darba ilgums",
		description:
			"Saglabā konkrētam darbam piesaistīto brigādi un ilgumu, kopīgo laiku neuzskaitot atkārtoti.",
		version: 2,
		text: `Without an explicit worker count, WorkersInvolved may remain null. An unambiguously enumerated group of distinct workers can support a count, but a single machinery/operator role without a numeric count must not require WorkersInvolved=1. Preserve its supported hours independently.
WorkersInvolved ir darbā iesaistīto cilvēku skaits; TimeInvolved ir avotā šim darbam norādītais ilgums, nevis apgalvojums par katra dalībnieka individuālajām stundām. Ja vienā darbā skaidri nosaukti operators un palīgstrādnieks, WorkersInvolved=2 ir pamatots arī tad, ja ilgums norādīts tikai vienam dalībniekam. Nenoņem pamatotu cilvēku skaitu tikai tāpēc, ka otra dalībnieka individuālais ilgums nav zināms. Saglabā norādīto ar darbu saistīto ilgumu, komentārā precīzi nošķirot tā piesaisti; neizdomā otra cilvēka stundas un nerēķini kopējās cilvēkstundas. Šis noteikums neatļauj kopīgo laiku dublēt vairākos atsevišķos darbos.
Preserve every explicitly stated labour duration in structured fields. When the source explicitly ties a worker group and duration to a specific work, keep that labour on the corresponding work row even when another work has a different duration. Use separate labour notes for duration groups only when their work assignment is not explicit, with null Amounts/Units and no duplicate labour on work rows. Never use the longest duration for everyone and never invent how shared labour was split between jobs. A compound role such as "būvdarbu vad. palīgs" is one person, not a manager plus an assistant.
Treat "No plkst. HH.MM" and similar "from time" phrases as start times only, not durations. If rows invented TimeInvolved from a start time, return repairable with set_null repairActions when the split is otherwise safe, or needs_model_repair when the row count/split is also wrong.
When material delivery and installed/placed work are already split, reject unsupported delivery WorkersInvolved or TimeInvolved copied from shared work labor/hours. Delivery rows should keep WorkersInvolved and TimeInvolved null unless the source explicitly ties labor/time to delivery, unloading, or transport. If only the delivery fields are wrong, keep expectedRecordCount unchanged, return verdict=repairable, and include set_null repairActions for those delivery fields while preserving the work row labor/hours.`,
	};
}
