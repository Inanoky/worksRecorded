import { createHash } from "node:crypto";
import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";
import {
	getOrganizationIdByUserId,
	getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";

export function workspaceCatalogRevision(
	sites: ReadonlyArray<{
		id: string;
		name: string;
		description: string | null;
		imageUrl: string | null;
		organizationId: string | null;
		bisCaseId: string | null;
	}>,
	language: string,
) {
	return createHash("sha256")
		.update(
			JSON.stringify([
				language,
				sites.map((s) => [
					s.id,
					s.name,
					s.description,
					s.imageUrl,
					s.organizationId,
					s.bisCaseId,
				]),
			]),
		)
		.digest("hex");
}
export async function loadWorkspaceCatalogRevision(userId: string) {
	const organizationId = await getOrganizationIdByUserId(userId);
	const admin = isSuperUserId(userId);
	const sites = await prisma.site.findMany({
		where: admin ? {} : { organizationId: organizationId ?? "" },
		select: {
			id: true,
			name: true,
			description: true,
			imageUrl: true,
			organizationId: true,
			bisCaseId: true,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
	const language = admin ? "en" : await getOrganizationLanguageByUserId(userId);
	return {
		revision: workspaceCatalogRevision(sites, language),
		scope: `${userId}:${admin ? "admin" : (organizationId ?? "admin")}`,
	};
}
