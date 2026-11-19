import type { DiaryPromptSection } from "./types";

export function atsauces_un_datumi(): DiaryPromptSection {
	return {
		id: "atsauces_un_datumi",
		title: "Atsauces, datumi un labojumu robežas",
		description:
			"Nosaka darba datumu un atļauto saikni ar iepriekšējiem ierakstiem, nepārkopējot vēsturiskus skaitļus.",
		version: 1,
		text: `The original message may explicitly refer to trusted reference items from the extraction context, for example same work, same place, yesterday, previous report, or continue. In that case, Works and Location may be supported by those reference items.
If trusted extraction context says CurrentMessageHasExplicitContextReference=true and contains matching recent reference items, do not mark a row unsafe merely because Works or Location came from that context.
Numeric fields still need current-message support unless the current message explicitly references that number. A phrase like "vēl 3h" supports TimeInvolved=3 for the new row, but does not support copying previous WorkersInvolved.
The reference date is trusted application context for resolving today/yesterday and an omitted year. Preserve an explicit work day/month and output a complete ISO date using that context; do not remove a known year from the proposed date.
Use an explicitly reported activity/completion date, not the receipt date, for a retrospective report. A correction changes only its requested facts; preserve unrelated dates, quantities and activities.`,
	};
}
