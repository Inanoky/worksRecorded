import { DIARY_ADDITIONAL_WORK_POLICY } from "../../diarySourcePolicy";
import type { DiaryPromptSection } from "../types";

export function ekstrakcijas_kategorijas(): DiaryPromptSection {
	return {
		id: "ekstrakcijas_kategorijas",
		title: "Projekta darbu un Forma2 piesaiste",
		description:
			"Izvēlas darbu no konkrētā projekta kataloga pēc darbības, materiāla un izmēra.",
		version: 2,
		text: `Works vērtību izvēlies tikai no dotās shēmas opcijām. Projekta kataloga kodi, nosaukumi, vienības un konfigurētie runas saīsinājumi ir vārdnīca, nevis paveikta darba pierādījums.
${DIARY_ADDITIONAL_WORK_POLICY}
Salīdzini darbības būtību, sistēmu, materiālu un izmēru. Precīza Forma2 pozīcijas atsauce palīdz atrast darbu, taču pretrunu starp kodu un aprakstu nedrīkst paslēpt. Nesaderīgu kodu, diametru vai vienību nepielāgo izvēlētai pozīcijai; neskaidro daļu saglabā pārbaudāmā piezīmē.
Piegādi, iestrādi un rakšanu nejauc. Ūdensvada darbs nav kanalizācijas darbs tikai līdzīgu vārdu dēļ. Vispārīgo projekta kategoriju lieto, ja tā precīzāk atbilst avotam nekā konkrētā Forma2 pozīcija. Trūkstošs apjoms neliedz izvēlēties skaidri aprakstīta darba kategoriju.`,
	};
}

export function ekstrakcijas_vieta(): DiaryPromptSection {
	return {
		id: "ekstrakcijas_vieta",
		title: "Avotā norādītā darba vieta",
		description:
			"Nepārņem vietu no vienīgās opcijas vai nesaistīta vēsturiska ieraksta.",
		version: 1,
		text: "Location izvēlies tikai no aktuālās ziņas vai skaidras atļautas atsauces uz iepriekšējo darba vietu. Vienīgā konfigurācijas opcija nav vietas pierādījums. Ja vieta nav pamatota, Location=null; avotā norādīto vietu saglabā, izmantojot atbilstošo shēmas vērtību.",
	};
}
