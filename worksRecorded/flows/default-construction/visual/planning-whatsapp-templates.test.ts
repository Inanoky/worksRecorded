import sectionCatalog from "@/assets/visual-sections/ar-701/catalog.json";
import {
	LIMENI_TASK_TEMPLATE,
	limeniSectionTemplates,
	limeniTaskTemplateBody,
	planningWhatsAppTemplateContent,
} from "./planning-whatsapp-templates";

const args = {
	templateName: LIMENI_TASK_TEMPLATE,
	objectName: "Šmerļa iela 3",
	message: "Darbs: XPS. Izpildes termiņš: 24.10.2026.",
	total: 2,
};

it.each(sectionCatalog.sections)(
	"sends $code with its approved fixed caption and no body parameters",
	({ code }) => {
		const content = planningWhatsAppTemplateContent({ ...args, section: code });
		const slug =
			code === "Minerālvates variants"
				? "mineral_wool"
				: code.toLowerCase().replace(/\./g, "_");
		expect(content).toEqual({
			name: `limeni_section_${slug}_v2`,
			parameters: [],
		});
	},
);

it("covers every drawing section without a generic section template", () => {
	expect(Object.keys(limeniSectionTemplates).sort()).toEqual(
		sectionCatalog.sections.map(({ code }) => code).sort(),
	);
});

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

it.each(["PA1.10", "toString", "__proto__"])(
	"rejects unsupported section %s rather than sending the old verbose template",
	(section) => {
		expect(() => planningWhatsAppTemplateContent({ ...args, section })).toThrow(
			"Sekcijai nav pieejama WhatsApp veidne.",
		);
	},
);

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
