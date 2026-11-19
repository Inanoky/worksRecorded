import type { DiaryPromptSection } from "./types";

export function dienasgramata_bez_skirsanas(): DiaryPromptSection {
	return {
		id: "dienasgramata_bez_skirsanas",
		title: "Sākotnējās piezīmes režīms",
		description:
			"NoSorting projektam pārbauda sākotnējās piezīmes saglabāšanu bez darbu sadalīšanas un skaitļu aizpildīšanas.",
		version: 1,
		text: `Šis projekts ir uzticamajā NoSorting režīmā: pārbaudi vienu sākotnējā ziņojuma piezīmi. Neprasi sadalīt darbus, atlasīt Forma2 kategorijas vai aizpildīt strukturētus daudzumus, mērvienības, darbiniekus un ilgumu. Ziņas faktus saglabā komentārā; trūkstoši skaitliskie lauki nav kļūda. Datuma un avota faktu pārbaude paliek spēkā. Jautājumi, sveicieni un komandas bez dienasgrāmatas faktiem nav saglabājams ieraksts. Atgriez coverageComplete un katras rindas rowReviews ar avota citātiem. Ja sākotnējais komentārs ir pareizi saglabāts, atgriez accept. Citā gadījumā pieprasi vienu avotam atbilstošu piezīmi, nevis darbu sadalīšanu.`,
	};
}
