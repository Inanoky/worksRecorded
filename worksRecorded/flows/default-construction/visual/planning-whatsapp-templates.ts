export const LIMENI_TASK_TEMPLATE = "limeni_work_task_v2";
export const limeniTaskTemplateBody =
	"*Darba uzdevums un izpildes termiņi*\n\n{{uzdevuma_apraksts}}\n\n*{{objekts}} — būvdarbu objekts.*";

export const LIMENI_SECTION_TEMPLATE = "limeni_section_drawing_v1";

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
					name: LIMENI_SECTION_TEMPLATE,
					parameters: [parameter("sekcija", args.section)],
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
