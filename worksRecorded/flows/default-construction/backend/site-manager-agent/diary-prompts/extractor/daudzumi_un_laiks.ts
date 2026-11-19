import { CALCULATION_INSTRUCTIONS } from "../../quantityEvidence";
import type { DiaryPromptSection } from "../types";

export function ekstrakcijas_daudzumi(): DiaryPromptSection {
	return {
		id: "ekstrakcijas_daudzumi",
		title: "Paveiktais apjoms un mērvienība",
		description:
			"Nošķir daudzumu no materiāla izmēra un pamato aprēķinus ar avota citātiem.",
		version: 1,
		text: `Amounts/Daudzums un Units/Mrv ir paveiktā darba apjoms un tā mērvienība. Stāvs, dzīvoklis, kārtu skaits, temperatūra, cilvēki, stundas, diametrs un materiāla biezums nav apjoms. “6.perona 2.pamatnes” nenozīmē divas izbūvētas pamatnes. Viena pabeigta darba pieminēšana nenozīmē Amounts=1.
“OSB 22 mm, ieklāti 45 m2” dod 45 m2; “reģipsis 2 kārtās” nedod apjomu; “Dz 6 45m2 vate, osb” dod 45 m2; “Dz5f durvju aile demontāža” nedod apjomu. “10 sienas” vai “5 durvis” tieši skaita objektus un dod gab./pcs atbilstoši shēmai.
Ja apjoms nav pateikts, Amounts un Units ir null. Saglabā skaidru apjomu arī tad, ja cita darba mērvienība nav zināma. Mērvienību aliasi: kubi=m3, kvadrāti=m2, gab.=pcs; lieto projekta shēmas vērtību. Nepārvērt m2 uz m3 bez avota izmēriem un nepievieno kataloga normas kā lietotāja faktus.
${CALCULATION_INSTRUCTIONS}`,
	};
}

export function ekstrakcijas_darbinieki_un_laiks(): DiaryPromptSection {
	return {
		id: "ekstrakcijas_darbinieki_un_laiks",
		title: "Brigāde, darba ilgums un tehnikas stundas",
		description:
			"Saglabā skaidri piesaistītu darbaspēku, nedublējot kopīgo laiku.",
		version: 1,
		text: `Workers/WorkersInvolved ir cilvēku skaits, Hours/TimeInvolved ir šī darba ilgums stundās. “2 cilvēki”, “trīs strādnieki” ir tieši skaiti. Bez skaita atstāj null; 0 lieto tikai skaidri norādītai nullei. Skaidri uzskaitīti vismaz divi dažādi dalībnieki vienā darbā atbalsta skaitu: operators un palīgstrādnieks ir 2. Viens operators pats par sevi nedod Workers=1. “Būvdarbu vad. palīgs” ir viena loma.
“Ieklātas grīdas 3. stāvā, 2 cilvēki, 3h” dod Workers=2 un Hours=3; stāvs nav apjoms. “Apmestas sienas, 4h” dod Workers=null un Hours=4. Saglabā katra darba skaidri norādīto ilgumu neatkarīgi no citu darbu stundām.
“No plkst. 15.00” ir sākums, nevis ilgums. Pilns darba intervāls 7.00–18.00 dod 11 stundas. Atsevišķu mašīnu lietošanas stundas resursu uzskaitījumā saglabā komentārā, nesummējot tās darba ilgumā. Ja viena mašīna un operators apraksta pašu vienīgo veikto darbu ar norādītu ilgumu, šo darba ilgumu saglabā.`,
	};
}
