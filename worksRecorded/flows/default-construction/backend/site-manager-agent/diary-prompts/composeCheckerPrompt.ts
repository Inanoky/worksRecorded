import { getDefaultConstructionForma2WorkSyncManifest } from "../../../lib/forma2-work-options-manifest";
import type { ConfigMap } from "../AIschemas";
import type { SupportedReplyLanguage } from "../fastPath";
import { atrasanas_vietas } from "./atrasanas_vietas";
import { atsauces_un_datumi } from "./atsauces_un_datumi";
import { avota_fakti_un_parklajums } from "./avota_fakti_un_parklajums";
import { darbinieki_un_darba_laiks } from "./darbinieki_un_darba_laiks";
import { darbu_kategorijas } from "./darbu_kategorijas";
import { darbu_sadalisana } from "./darbu_sadalisana";
import { dienasgramata_bez_skirsanas } from "./dienasgramata_bez_skirsanas";
import { dienasgramatas_saglabasanas_piezimes } from "./dienasgramatas_saglabasanas_piezimes";
import { forma2_piesaiste } from "./forma2_piesaiste";
import { labojuma_gala_parbaude } from "./labojuma_gala_parbaude";
import { lemums_un_labosanas_plans } from "./lemums_un_labosanas_plans";
import { mervienibas_buvnieciba } from "./mervienibas_buvnieciba";
import type { DiaryPromptSection, DiaryPromptSelection } from "./types";

const diaryFields = [
	"Date",
	"Works",
	"Location",
	"Comments",
	"Amounts",
	"Units",
	"WorkersInvolved",
	"TimeInvolved",
];

export function composeSiteDiaryCheckerPrompt(args: {
	language: SupportedReplyLanguage;
	projectConfig?: ConfigMap;
	rows?: Record<string, unknown>[];
	repair?: boolean;
}) {
	const config = args.projectConfig;
	const settings = config?.AIpromptToUse as unknown as
		| { Client?: string }
		| undefined;
	const commentOnly = settings?.Client === "NoSorting";
	const enabledFields = config
		? diaryFields.filter(
				(field) => config[field] && config[field].Type !== "noRender",
			)
		: [...diaryFields];
	const hasFields = (...fields: string[]) =>
		fields.some(
			(field) =>
				enabledFields.includes(field) ||
				args.rows?.some((row) => row[field] != null),
		);
	const hasForma2 =
		!config ||
		Object.values(config.Works?.DropDownOptions ?? {}).some((work) =>
			/^\s*\d+(?:\.\d+)+(?:[.\s:–—-]|$)/u.test(work),
		) ||
		Boolean(
			getDefaultConstructionForma2WorkSyncManifest(config)?.entries.length,
		);
	const sections: DiaryPromptSection[] = [];
	const selection: DiaryPromptSelection[] = [];
	const include = (
		section: DiaryPromptSection,
		included: boolean,
		reason: string,
	) => {
		const { text, ...manifest } = section;
		selection.push({ ...manifest, included, reason, characters: text.length });
		if (included) sections.push(section);
	};
	include(
		avota_fakti_un_parklajums(commentOnly),
		true,
		"Avota fakti un pārklājums jāpārbauda katram ziņojumam.",
	);
	include(
		atsauces_un_datumi(),
		true,
		"Datums un atsauču izcelsme jāpārbauda katrā režīmā.",
	);
	include(
		darbu_sadalisana(),
		!commentOnly,
		commentOnly
			? "NoSorting saglabā sākotnējo piezīmi bez darbu sadalīšanas."
			: "Projektā lietota strukturētu darbu ekstrakcija.",
	);
	include(
		darbu_kategorijas(),
		!commentOnly,
		commentOnly
			? "NoSorting neprasa darbu kategoriju atlasi."
			: "Darbi jāvērtē pēc šī projekta kataloga.",
	);
	include(
		mervienibas_buvnieciba(Object.values(config?.Units?.DropDownOptions ?? {})),
		!commentOnly && hasFields("Amounts", "Units"),
		commentOnly
			? "NoSorting neaizpilda strukturētus daudzumus."
			: hasFields("Amounts", "Units")
				? "Projektā ir daudzumu/mērvienību lauki vai šādi dati piedāvātajās rindās."
				: "Projektā nav daudzumu/mērvienību lauku vai piedāvātu vērtību.",
	);
	include(
		darbinieki_un_darba_laiks(),
		!commentOnly && hasFields("WorkersInvolved", "TimeInvolved"),
		commentOnly
			? "NoSorting neaizpilda strukturētu darbaspēku."
			: hasFields("WorkersInvolved", "TimeInvolved")
				? "Projektā ir darbaspēka lauki vai šādi dati piedāvātajās rindās."
				: "Projektā nav strukturēta darbaspēka lauku vai vērtību.",
	);
	include(
		atrasanas_vietas(),
		!commentOnly && hasFields("Location"),
		commentOnly
			? "NoSorting neprasa strukturētas vietas izvēli."
			: hasFields("Location")
				? "Projektā ir vietas lauks vai piedāvāta vietas vērtība."
				: "Projektā nav vietas lauka vai piedāvātas vietas vērtības.",
	);
	include(
		forma2_piesaiste(),
		!commentOnly && hasForma2,
		commentOnly
			? "NoSorting neprasa Forma2 piesaisti."
			: hasForma2
				? "Katalogā ir Forma2 pozīcijas vai saglabāta Forma2 darbu saite; bez konfigurācijas saglabā pilno saderīgo profilu."
				: "Projektā nav Forma2 pozīciju vai darbu saišu.",
	);
	include(
		dienasgramatas_saglabasanas_piezimes(),
		true,
		"Avota fakti jāsaglabā arī daļēja vai neskaidra rezultāta gadījumā.",
	);
	include(
		dienasgramata_bez_skirsanas(),
		commentOnly,
		commentOnly
			? "Projekta uzticamajā konfigurācijā izvēlēts NoSorting."
			: "Projektā nav izvēlēts NoSorting.",
	);
	include(
		lemums_un_labosanas_plans(),
		true,
		"Katram checker izsaukumam vajadzīgs strukturēts lēmums.",
	);
	include(
		labojuma_gala_parbaude(),
		Boolean(args.repair),
		args.repair
			? "Šī ir labošanas rezultāta pārbaude ar iepriekšējo lēmumu."
			: "Pirmreizējai pārbaudei vēl nav iepriekšēja labošanas lēmuma.",
	);
	const profile = commentOnly ? "comment-only" : "construction";
	const fieldPolicy = config
		? `Šī projekta aktīvie standarta lauki: ${enabledFields.join(", ") || "nav"}. Neprasi aizpildīt laukus, kas projektā nav ieslēgti; avotā minētos faktus nepieciešamības gadījumā saglabā komentārā. Ja neatļauta lauka vērtība jau piedāvāta rindā, pārbaudi to un neprasi jaunus datus tās aizpildīšanai.`
		: "Projekta konfigurācija nav padota: lieto pilno noklusēto būvniecības pārbaudes profilu.";
	const systemText = [
		`Dienasgrāmatas checker profils: ${profile}.`,
		fieldPolicy,
		...sections.map(
			(section) =>
				`## ${section.id} (v${section.version}) — ${section.title}\nMērķis: ${section.description}\n${section.text}`,
		),
		`Use language=${args.language} for reason and repairInstructions when practical.`,
	].join("\n\n");
	return {
		systemText,
		manifest: {
			version: 1,
			profile,
			enabledFields,
			sections: selection,
			characters: systemText.length,
		},
	};
}
