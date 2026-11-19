import { DIARY_WORK_SPLIT_POLICY } from "../../diarySourcePolicy";
import type { DiaryPromptSection } from "../types";

export function ekstrakcijas_darbu_sadalisana(): DiaryPromptSection {
	return {
		id: "ekstrakcijas_darbu_sadalisana",
		title: "Patstāvīgi darbi un izmantotie resursi",
		description:
			"Sadala atsevišķus darbus, saglabājot viena darba tehniku un operatoru kopā.",
		version: 1,
		text: `${DIARY_WORK_SPLIT_POLICY}
Piemērs: “Papilddarbi pabeigti plkst. 18.00. Izmantots ekskavators 3 h un Manitou 1 h.” ir viens papilddarbu ieraksts. Visus faktus saglabā tā komentārā; 3 h un 1 h ir tehnikas izmantošana, nevis visa darba ilgums. Darba Hours/TimeInvolved paliek null. Neveido atsevišķus tehnikas ierakstus un nesummē šos laikus.
Piegāde un iestrāde ar katrai savu darbību un apjomu ir divi ieraksti: “ievesta smilts 160 m3, iestrādāti 140 m3”. Kopīgo darba brigādi/laiku piesaisti iestrādei; piegādei tikai tad, ja avots to pasaka. Viena operatora vienlaikus veiktas saistītas apakšdarbības nav patstāvīgi darbi.`,
	};
}
