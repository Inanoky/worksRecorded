import type { VisualPlan } from "./planning-model";
import {
	normalizePlanningWhatsAppMessage,
	normalizePlanningWhatsAppTemplateText,
	planningWhatsAppMessage,
} from "./planning-whatsapp";

it("formats a task with bold labels, spacing, dates and its selected section", () => {
	const message = planningWhatsAppMessage({
		work: "XPS izolācija",
		location: "2. stāvs",
		quantity: 12.5,
		unit: "m²",
		startDate: "2026-10-21",
		endDate: "2026-10-23",
		geometry: { version: 1, section: "PA1.6", areas: [] },
	} as unknown as VisualPlan);
	expect(message).toContain(
		"*Darba uzdevums*\n\n*Darbs:* XPS izolācija\n*Lokācija:* 2. stāvs",
	);
	expect(message).toContain(
		"*Plānotais apjoms:* 12,5 m²\n*Sekcija:* PA1.6\n\n*Sākums:*",
	);
	expect(message).toContain("21.10.2026.");
});

it("preserves paragraph breaks in image captions while making template fallback text a single line", () => {
	const message = normalizePlanningWhatsAppMessage(
		"  Darbs\r\n\r\n\r\n\t  XPS   izolācija  ",
	);
	expect(message).toBe("Darbs\n\nXPS izolācija");
	expect(normalizePlanningWhatsAppTemplateText(message)).toBe(
		"Darbs XPS izolācija",
	);
});
