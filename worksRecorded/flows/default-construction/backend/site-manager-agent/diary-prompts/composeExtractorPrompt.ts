import type { ConfigMap } from "../AIschemas";
import { ekstrakcijas_avots_un_piezimes } from "./extractor/avots_un_piezimes";
import { ekstrakcijas_darbu_sadalisana } from "./extractor/darbu_sadalisana";
import {
	ekstrakcijas_darbinieki_un_laiks,
	ekstrakcijas_daudzumi,
} from "./extractor/daudzumi_un_laiks";
import {
	ekstrakcijas_kategorijas,
	ekstrakcijas_vieta,
} from "./extractor/kategorijas_un_vieta";
import type { DiaryPromptSection, DiaryPromptSelection } from "./types";

export function composeSiteDiaryExtractorPrompt(args: {
	language: string;
	client?: string;
	projectConfig?: ConfigMap;
}) {
	const config = args.projectConfig;
	const client =
		args.client ??
		(config?.AIpromptToUse as unknown as { Client?: string })?.Client;
	const commentOnly = client === "NoSorting";
	const enabledFields = config
		? Object.entries(config)
				.filter(([, field]) => field.Type !== "noRender")
				.map(([key]) => key)
		: [
				"Date",
				"Works",
				"Comments",
				"Location",
				"Amounts",
				"Units",
				"WorkersInvolved",
				"TimeInvolved",
			];
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
		ekstrakcijas_avots_un_piezimes(),
		!commentOnly,
		"Strukturētā režīmā jāpamato katra darba fakti.",
	);
	include(
		ekstrakcijas_darbu_sadalisana(),
		!commentOnly,
		"Patstāvīgus darbus sadala tikai strukturētā režīmā.",
	);
	include(
		ekstrakcijas_kategorijas(),
		!commentOnly && enabledFields.includes("Works"),
		"Kategorijas izvēlas, ja projektā ieslēgts darbu lauks.",
	);
	include(
		ekstrakcijas_daudzumi(),
		!commentOnly &&
			enabledFields.some((field) => ["Amounts", "Units"].includes(field)),
		"Daudzumu noteikumi vajadzīgi tikai ieslēgtiem daudzumu laukiem.",
	);
	include(
		ekstrakcijas_darbinieki_un_laiks(),
		!commentOnly &&
			enabledFields.some((field) =>
				["WorkersInvolved", "TimeInvolved"].includes(field),
			),
		"Darbaspēku iegūst tikai projektā ieslēgtajos laukos.",
	);
	include(
		ekstrakcijas_vieta(),
		!commentOnly && enabledFields.includes("Location"),
		"Vietas noteikumi vajadzīgi, ja projektā ir vietas lauks.",
	);
	include(
		{
			id: "ekstrakcijas_bez_skirsanas",
			title: "Sākotnējā piezīme bez šķirošanas",
			description:
				"Saglabā sākotnējo ziņu vienā piezīmē bez strukturētas ekstrakcijas.",
			version: 1,
			text: "Saglabā sākotnējo ziņu Comments bez izmaiņām vienā projekta piezīmju kategorijas ierakstā. Ziņu nesadali, vietu, apjomu, mērvienību, darbiniekus un stundas neiegūsti; šie lauki ir null. Tikai Date lieto ziņas darba datumu vai atsauces datumu yyyy-mm-dd.",
		},
		commentOnly,
		"Šis modulis paredzēts tikai uzticamam NoSorting profilam.",
	);
	const profile = commentOnly
		? "comment-only"
		: client === "GMCIRL"
			? "GMCIRL"
			: "construction";
	const systemText = [
		`Tu iegūsti būvdarbu dienasgrāmatas datus. Profils: ${profile}. Comments valoda: ${args.language}. Lauku nosaukumus un atļautās vērtības nosaka projekta izvades shēma; lieto tās precīzi. Neieslēgtu lauku faktus saglabā komentārā.`,
		...sections.map(
			(section) =>
				`## ${section.id} (v${section.version}) — ${section.title}\nMērķis: ${section.description}\n${section.text}`,
		),
		...(client === "GMCIRL"
			? [
					"GMCIRL profilā komentāra beigās iekavās saglabā sākotnējo ziņu nemainītu. Izmaiņu vai neparedzētu darbu CE kategoriju lieto tikai tad, ja tā ir projekta shēmā un avots to pamato.",
				]
			: []),
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
