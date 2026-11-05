import { z } from "zod";

export const fimaActTypes = {
	setting_out: "Galveno būvasu nospraušana",
	foundations: "Kontakttīkla balstu pamatu un enkurpamatu iegremdēšana",
	supports: "Kontakttīkla balstu uzstādīšana",
	crossbeams: "Šķērssiju montāža",
	console_brackets: "Kontakttīkla konsoļu stiprinājumu montāža",
	consoles: "Kontakttīkla konsoļu montāža",
	voltage_consoles: "6–10 kV konsoļu montāža ar stiprinājumiem",
	feeder_insulators: "Barošanas vada izolatoru un to stiprinājumu montāža",
	feeder_wire: "Barošanas vada montāža",
	tensioning_devices: "Spriegošanas ierīču montāža",
	counterweights: "Kontakttīkla spriegošanas ierīču atsvaru montāža",
	contact_wire: "Kontaktvada montāža",
	carrying_wire: "Nesējtroses vada montāža",
	midpoint_carrying_wire: "Nesējtroses vada montāža viduspunktiem",
	dropper_wire: "Stigu vada un stigu spaiļu montāža",
	group_earthing: "Grupveida zemējuma stiprinājumu montāža",
	rail_earthing: "Iekārtas zemējuma vada pievienošanai pie sliedes montāža",
	earthing_wire: "Zemējumvada montāža",
	disconnector_controls:
		"Vakuuma atvienotājslēdža vadības sadalnes UMPlus uzstādīšana",
	lighting: "ELT 0,4 kV kabeļu līnija un apgaismojums",
	scada: "SCADA sistēmas izbūve",
} as const;

export type FimaActType = keyof typeof fimaActTypes;
export const fimaActTypeSchema = z.custom<FimaActType>(
	(value) => typeof value === "string" && Object.hasOwn(fimaActTypes, value),
);

export function formatFimaActType(type: FimaActType | null | undefined) {
	return (type && fimaActTypes[type]) || "Nav izvēlēts";
}

const shortActTypeLabels: Partial<Record<FimaActType, string>> = {
	foundations: "Balstu un enkuru pamati",
	console_brackets: "Konsoļu stiprinājumi",
	consoles: "Kontakttīkla konsoles",
	voltage_consoles: "6–10 kV konsoles",
	feeder_insulators: "Barošanas vada izolatori",
	counterweights: "Spriegošanas ierīču atsvari",
	midpoint_carrying_wire: "Nesējtroses viduspunkti",
	rail_earthing: "Zemējuma pieslēgums sliedei",
	disconnector_controls: "UMPlus vadības sadalnes",
};

export function formatFimaActTypeCell(type: FimaActType | null | undefined) {
	return (type && shortActTypeLabels[type]) || formatFimaActType(type);
}

const actTitleRules: [FimaActType, RegExp][] = [
	["setting_out", /^galveno būvasu nospraušan/],
	["foundations", /^kontakttīkl[au] balstu pamatu/],
	["supports", /^kontakttīkl[au] balstu (mš|mta)/],
	["crossbeams", /^šķērssiju montāž/],
	["console_brackets", /^kontakttīkla konsoļu stiprinājumu/],
	["consoles", /^kontakttīkla konsoļu montāž/],
	["voltage_consoles", /^konsoļu 6\s*[-–]\s*10\s*kv/],
	["feeder_insulators", /^barošanas vada izolatoru/],
	["feeder_wire", /^barošanas vada montāž/],
	["tensioning_devices", /^(kontakttīkla )?spriegošanas ierīču montāž/],
	["counterweights", /^(kontakttīkla )?spriegošanas ierīču atsvaru/],
	["contact_wire", /^kontaktvada montāž/],
	["carrying_wire", /^nesējtroses vada montāžas/],
	["midpoint_carrying_wire", /^nesējtroses vada.*viduspunkt/],
	["dropper_wire", /^stigu vada un stigu spaiļu/],
	["group_earthing", /^grupveida zemējuma stiprinājumu/],
	["rail_earthing", /^iekārtas zemējuma vada pievienošanai pie sliedes/],
	["earthing_wire", /^zemējumvada montāž/],
	["disconnector_controls", /^vakuuma.*umplus/],
	["lighting", /^elt 0[,.]4 kv/],
	["scada", /^scada sistēmas izbūv/],
];

export function inferFimaActType(title: string | null | undefined) {
	const normalized = (title ?? "")
		.normalize("NFC")
		.trim()
		.toLocaleLowerCase("lv-LV")
		.replace(/\s+/g, " ");
	const matches = actTitleRules.filter(([, rule]) => rule.test(normalized));
	return matches.length === 1 ? matches[0][0] : null;
}

export function inferLinkedFimaActType(
	coverage: { acts: { title?: string; description?: string }[] } | undefined,
): FimaActType | null {
	if (!coverage?.acts.length) return null;
	const types = coverage.acts.map((act) =>
		inferFimaActType(act.title || act.description),
	);
	return types[0] && types.every((type) => type === types[0]) ? types[0] : null;
}
