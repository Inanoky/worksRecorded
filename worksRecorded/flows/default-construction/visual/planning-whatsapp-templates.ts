export const LIMENI_TASK_TEMPLATE = "limeni_work_task_v2";
export const limeniTaskTemplateBody =
	"*Darba uzdevums un izpildes termiņi*\n\n{{uzdevuma_apraksts}}\n\n*{{objekts}} — būvdarbu objekts.*";

export const limeniSectionTemplates: Readonly<Record<string, string>> = {
	"PA1.1": "limeni_section_pa1_1_v2",
	"PA1.2": "limeni_section_pa1_2_v2",
	"PA1.3": "limeni_section_pa1_3_v2",
	"PA1.4": "limeni_section_pa1_4_v2",
	"PA1.5": "limeni_section_pa1_5_v2",
	"PA1.6": "limeni_section_pa1_6_v2",
	"PA1.7": "limeni_section_pa1_7_v2",
	"PA1.8": "limeni_section_pa1_8_v2",
	"PA1.9": "limeni_section_pa1_9_v2",
	Ge1: "limeni_section_ge1_v2",
	Ge2: "limeni_section_ge2_v2",
	Ge3: "limeni_section_ge3_v2",
	Ge4: "limeni_section_ge4_v2",
	Ge5: "limeni_section_ge5_v2",
	Ge6: "limeni_section_ge6_v2",
	J1: "limeni_section_j1_v2",
	J3: "limeni_section_j3_v2",
	"Minerālvates variants": "limeni_section_mineral_wool_v2",
};

export function limeniSectionTemplateName(section: string) {
	const name = Object.hasOwn(limeniSectionTemplates, section)
		? limeniSectionTemplates[section]
		: undefined;
	if (!name) throw new Error("Sekcijai nav pieejama WhatsApp veidne.");
	return name;
}

export function planningWhatsAppTemplateContent(args: {
	templateName: string;
	objectName: string;
	message: string;
	section?: string | null;
	total: number;
}) {
	const parameter = (parameter_name: string, text: string) => ({
		type: "text" as const,
		parameter_name,
		text,
	});
	if (args.templateName === LIMENI_TASK_TEMPLATE) {
		return args.section
			? {
					name: limeniSectionTemplateName(args.section),
					parameters: [],
				}
			: {
					name: LIMENI_TASK_TEMPLATE,
					parameters: [
						parameter(
							"uzdevuma_apraksts",
							args.message.replace(/^\*Darba uzdevums\*\s+/u, ""),
						),
						parameter("objekts", args.objectName),
					],
				};
	}
	return {
		name: args.templateName,
		parameters: [
			parameter("objekts", args.objectName),
			parameter("uzdevuma_apraksts", args.message),
			parameter("attelu_skaits", String(args.total)),
		],
	};
}
