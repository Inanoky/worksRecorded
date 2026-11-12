import sectionCatalog from "@/assets/visual-sections/ar-701/catalog.json";
import raudasSectionCatalog from "@/assets/visual-sections/raudas-16/catalog.json";
import {
	LIMENI_SECTION_TEMPLATE,
	LIMENI_TASK_TEMPLATE,
	limeniTaskTemplateBody,
	planningWhatsAppTemplateContent,
} from "./planning-whatsapp-templates";

const args = {
	templateName: LIMENI_TASK_TEMPLATE,
	objectName: "Šmerļa iela 3",
	message: "Darbs: XPS. Izpildes termiņš: 24.10.2026.",
	total: 2,
};

it.each([...sectionCatalog.sections, ...raudasSectionCatalog.sections])(
	"sends $code using the shared section drawing template",
	({ code }) => {
		expect(planningWhatsAppTemplateContent({ ...args, section: code })).toEqual(
			{
				name: LIMENI_SECTION_TEMPLATE,
				parameters: [{ type: "text", parameter_name: "sekcija", text: code }],
			},
		);
	},
);

it("matches the approved task body without image counts or acknowledgement instructions", () => {
	const content = planningWhatsAppTemplateContent(args);
	expect(content.name).toBe(LIMENI_TASK_TEMPLATE);
	expect(
		content.parameters.map(({ parameter_name }) => parameter_name),
	).toEqual(["uzdevuma_apraksts", "objekts"]);
	let rendered = limeniTaskTemplateBody;
	for (const parameter of content.parameters)
		rendered = rendered.replace(
			`{{${parameter.parameter_name}}}`,
			parameter.text,
		);
	expect(rendered).toBe(
		`*Darba uzdevums un izpildes termiņi*\n\n${args.message}\n\n*${args.objectName} — būvdarbu objekts.*`,
	);
	expect(rendered).not.toMatch(/pievienotie|iepazīst|attēlu skaits/i);
});

it("avoids repeating the heading from the prepared task message", () => {
	const content = planningWhatsAppTemplateContent({
		...args,
		message: `*Darba uzdevums* ${args.message}`,
	});
	expect(content.parameters[0].text).toBe(args.message);
});

it("preserves other configured templates", () => {
	const content = planningWhatsAppTemplateContent({
		...args,
		templateName: "thermowhite_darba_uzdevums",
	});
	expect(content.name).toBe("thermowhite_darba_uzdevums");
	expect(
		content.parameters.map(({ parameter_name }) => parameter_name),
	).toEqual(["objekts", "uzdevuma_apraksts", "attelu_skaits"]);
});
