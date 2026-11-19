import type { DiaryPromptSection } from "./types";

export function mervienibas_buvnieciba(
	units: string[] = [],
): DiaryPromptSection {
	return {
		id: "mervienibas_buvnieciba",
		title: "Būvniecības daudzumi un mērvienības",
		description:
			"Atšķir paveikto apjomu no izmēriem un pārbauda mērvienības, skaitļu izcelsmi un aprēķinus.",
		version: 1,
		text: `Weather temperatures, platform numbers and ordinal foundation numbers are never completed quantities. A source saying "6.perona 2.pamatnes" means platform 6 / second foundation unless the user explicitly counts completed foundations; do not invent two foundations.
Amounts and Units are first-class fields to validate. Preserve proposed Amounts/Units when the current message explicitly states a completed work quantity or delivered/placed material quantity, for example "45 m2 ieklāts OSB", "ievesta smilts 180 kubi", or "iestrādāti 140 m3".
When the message contains both a completed scope quantity and material/resource dimensions, prefer the completed scope quantity for Amounts/Units and keep dimensions only in Comments. For example, in "OSB 22 mm, ieklāti 45 m2", Amounts=45 and Units=m2 are supported; "22 mm" is material specification, not completed quantity.
A number directly counting completed construction objects implies pieces even when the source does not literally say pcs or gab. Preserve Amounts=10 and Units=pcs for "10 sienas", Amounts=5 and Units=pcs for "5 durvis", and equivalent explicit object counts.
Reject or repair unsupported Amounts/Units only when they came from context numbers, apartment/floor numbers, layer counts, worker counts, hours, start times, or material dimensions/specifications such as "22 mm" or "45x45 latojums".
Explicit source length multiplied by an explicitly reported per-metre rate supports a calculated quantity, including rounding to two decimals. Validate the operands and equation rather than requiring the final number to occur literally in the message.
Ja vienam aprēķinam avotā ir pretrunīgi skaitļi, piemēram, garums 22,09 un vēlāk 22,9 metri, neizvēlies vienu no tiem kā apstiprinātu aprēķina pamatu. Saglabā pārējos pamatotos darbus un tikai pretrunīgo aprēķinu atsevišķā pārskatāmā piezīmē ar null Amounts/Units, komentārā saglabājot avota fragmentu un īsu norādi “Jāpārbauda.”.
Verify work category AND configured unit; never convert m2 to m3 without explicit dimensional evidence. If no compatible estimate position exists, retain the measured scope in a review note rather than claiming it belongs to an incompatible estimate position.
Mērvienību aliasi: m²/m2, m³/m3 un gab./pcs apzīmē vienādas fiziskās mērvienības. Sarunvalodā “kubi” apzīmē m³, “kvadrātmetri/kvadrāti” — m² un garuma metri — m; mm un cm aprakstā var būt materiāla izmērs, nevis paveikts apjoms. Projekta opcijas un darba kataloga mērvienība nosaka saglabājamo vērtību.
Projekta mērvienību opcijas (vārdnīca, nevis paveikta darba pierādījums): ${units.length ? JSON.stringify(units) : "nav norādītas; nepievieno nenorādītu mērvienību"}.`,
	};
}
