import { prisma } from "@/lib/utils/db";
import { normalizeInternationalPhoneForWhatsApp } from "@/lib/utils/phone/international-phone";

export async function organizationPlanningContacts(organizationId: string) {
	const [members, workers] = await Promise.all([
		prisma.user.findMany({
			where: { organizationId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				phone: true,
				status: true,
			},
		}),
		prisma.workers.findMany({
			where: {
				OR: [
					{ organizationId },
					{ organizationId: null, Site: { organizationId } },
				],
			},
			select: { id: true, name: true, surname: true, phone: true },
		}),
	]);
	const contacts: Array<{
		id: string;
		name: string;
		phone: string;
		archivedAt: string | null;
	}> = [];
	for (const member of members) {
		if (
			["inactive", "disabled", "archived", "deleted"].includes(
				member.status?.toLowerCase() ?? "",
			)
		)
			continue;
		const phone = normalizeInternationalPhoneForWhatsApp(member.phone);
		const name = [member.firstName, member.lastName]
			.filter(Boolean)
			.join(" ")
			.trim();
		if (phone && name)
			contacts.push({
				id: `member:${member.id}`,
				name,
				phone,
				archivedAt: null,
			});
	}
	for (const worker of workers) {
		const phone = normalizeInternationalPhoneForWhatsApp(worker.phone);
		const name = [worker.name, worker.surname].filter(Boolean).join(" ").trim();
		if (phone && name)
			contacts.push({
				id: `worker:${worker.id}`,
				name,
				phone,
				archivedAt: null,
			});
	}
	return contacts.sort((left, right) =>
		left.name.localeCompare(right.name, "lv"),
	);
}
