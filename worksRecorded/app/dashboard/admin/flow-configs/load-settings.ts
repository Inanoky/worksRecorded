"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFlowAssignments } from "@/lib/flows/assignments-server";
import { getFlowModules } from "@/lib/flows/registry";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function loadFlowConfigs() {
	const user = await requireUser();
	const requestHeaders = await headers();
	if (
		!canAccessFlowConfigAdmin(
			user.id,
			requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
		)
	)
		notFound();

	const [organizations, assignments, users] = await Promise.all([
		prisma.organization.findMany({
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				_count: { select: { sites: true, users: true } },
			},
		}),
		getFlowAssignments(),
		prisma.user.findMany({
			orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				organizationId: true,
				organization: { select: { name: true } },
			},
		}),
	]);
	return { organizations, assignments, users, flowModules: getFlowModules() };
}

export type FlowConfigsData = Awaited<ReturnType<typeof loadFlowConfigs>>;
