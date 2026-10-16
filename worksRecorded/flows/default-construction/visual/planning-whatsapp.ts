import type { VisualPlan } from "./planning-model";

export function normalizePlanningWhatsAppPhone(value: string) {
	const compact = value
		.trim()
		.replace(/[\s().-]/g, "")
		.replace(/^00/, "+");
	return /^\+?[1-9]\d{7,14}$/.test(compact) ? compact.replace(/^\+/, "") : null;
}

export function planningWhatsAppMessage(plan: VisualPlan) {
	const formatDate = (date: string) =>
		new Intl.DateTimeFormat("lv-LV", { timeZone: "UTC" }).format(
			new Date(`${date}T00:00:00Z`),
		);
	return [
		"Darba uzdevums",
		`Darbs: ${plan.work}`,
		`Lokācija: ${plan.location}`,
		`Plānotais apjoms: ${new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 20 }).format(plan.quantity)} ${plan.unit}`,
		...(plan.geometry.section ? [`Sekcija: ${plan.geometry.section}`] : []),
		`Sākums: ${formatDate(plan.startDate)}`,
		`Izpildes termiņš: ${formatDate(plan.endDate)}`,
	].join("\n");
}

export function planningMessageWithShare(message: string, url: string) {
	return message.includes(url)
		? message
		: `${message.trim()}\n\nZonas attēls: ${url}`;
}

export function planningWhatsAppUrl(phone: string, message: string) {
	const number = normalizePlanningWhatsAppPhone(phone);
	if (!number || !message.trim()) return null;
	return `https://web.whatsapp.com/send?${new URLSearchParams({
		phone: number,
		text: message,
	})}`;
}
