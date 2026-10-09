import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TgemAccessGroupSettings } from "@/flows/tgem-invoice-approval/frontend/TgemAccessGroupSettings";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getTgemAccessAdminData } from "@/server/actions/tgem-access-actions";

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function TgemAccessAdminPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requireUser();
	const requestHeaders = await headers();
	if (
		!canAccessFlowConfigAdmin(
			user.id,
			requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
		)
	) {
		notFound();
	}
	const params = await searchParams;
	const assignments = await prisma.flowAssignment.findMany({
		where: {
			flowModuleKey: FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL,
			enabled: true,
		},
		select: { organizationId: true },
	});
	const organizations = await prisma.organization.findMany({
		where: {
			id: { in: assignments.map((assignment) => assignment.organizationId) },
		},
		orderBy: { name: "asc" },
		select: { id: true, name: true },
	});
	const requestedId = firstValue(params.organization);
	if (
		requestedId &&
		!organizations.some((organization) => organization.id === requestedId)
	) {
		notFound();
	}
	const selectedId = requestedId ?? organizations[0]?.id;
	const selected = selectedId ? await getTgemAccessAdminData(selectedId) : null;

	return (
		<div className="mx-auto w-full max-w-7xl space-y-6">
			<div className="space-y-2 border-b pb-4">
				<h1 className="text-2xl font-semibold">TGEM piekļuves grupas</h1>
				<p className="text-sm text-muted-foreground">
					Pārvaldiet organizācijas grupas, atļaujas un organizācijas līmeņa
					piešķīrumus.
				</p>
				<div className="flex flex-wrap gap-2 pt-2">
					{organizations.map((organization) => (
						<Link
							key={organization.id}
							href={`/dashboard/admin/tgem-access?organization=${encodeURIComponent(organization.id)}`}
							className={`rounded-md border px-3 py-2 text-sm ${organization.id === selectedId ? "bg-blue-600 text-white" : "bg-background"}`}
						>
							{organization.name}
						</Link>
					))}
				</div>
			</div>
			{selected ? (
				<TgemAccessGroupSettings
					organizationId={selected.id}
					canEditGroups
					groups={selected.tgemAccessGroups.map((group) => ({
						id: group.id,
						name: group.name,
						permissions: group.permissions,
						memberUserIds: group.organizationMemberships.map(
							(membership) => membership.userId,
						),
					}))}
					users={selected.users.map((member) => ({
						id: member.id,
						name: `${member.firstName} ${member.lastName}`.trim(),
						email: member.email,
					}))}
				/>
			) : (
				<p className="text-sm text-muted-foreground">
					Nav aktīvu TGEM organizāciju.
				</p>
			)}
		</div>
	);
}
