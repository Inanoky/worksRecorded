"use server";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";
import {
	normalizeSbPlanValue,
	SB_STOMME_ORGANIZATION_ID,
	type SbPlanValues,
	sbPlanEditSchema,
} from "@/flows/default-construction/sb-stomme-inline-plan/model";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";

export async function saveSbStommePlanRow(input: unknown) {
	try {
		const parsed = sbPlanEditSchema.safeParse(input);
		if (!parsed.success) return { ok: false as const, error: "Nederīgi dati." };
		const session = await getKindeServerSession().getUser();
		const user = session
			? await prisma.user.findUnique({
					where: { id: session.id },
					select: { organizationId: true, status: true },
				})
			: null;
		if (
			!user ||
			user.organizationId !== SB_STOMME_ORGANIZATION_ID ||
			(user.status !== null && user.status !== "active") ||
			(await resolveFlowModuleKeyForRuntime({
				organizationId: user.organizationId,
			})) !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
		)
			return { ok: false as const, error: "Nav piekļuves." };
		const { recordId, values: draft, expected } = parsed.data;
		let values: SbPlanValues;
		try {
			values = {
				weather: normalizeSbPlanValue("weather", draft.weather ?? ""),
				plannedWork: normalizeSbPlanValue(
					"plannedWork",
					draft.plannedWork ?? "",
				),
				plannedAmount: normalizeSbPlanValue(
					"plannedAmount",
					draft.plannedAmount ?? "",
				),
			};
		} catch (error) {
			return {
				ok: false as const,
				error: error instanceof Error ? error.message : "Nederīga vērtība.",
			};
		}
		const updated = await prisma.sitediaryrecords.updateMany({
			where: {
				id: recordId,
				archivedAt: null,
				Site: { organizationId: SB_STOMME_ORGANIZATION_ID },
				Works_Custom_1: expected.plannedWork,
				Works_Custom_2: expected.weather,
				Comments_Custom_2: expected.plannedAmount,
			},
			data: {
				Works_Custom_1: values.plannedWork,
				Works_Custom_2: values.weather,
				Comments_Custom_2: values.plannedAmount,
			},
		});
		if (updated.count !== 1)
			return {
				ok: false as const,
				error: "Ieraksts mainīts vai nav pieejams. Pārlādējiet lapu.",
			};
		revalidatePath("/dashboard/all-projects");
		return { ok: true as const, values };
	} catch {
		return {
			ok: false as const,
			error: "Neizdevās saglabāt. Mēģiniet vēlreiz.",
		};
	}
}
