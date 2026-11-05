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
