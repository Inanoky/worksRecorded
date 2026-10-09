export const TGEM_PERMISSIONS = [
	"invoice.view",
	"invoice.edit_basic",
	"invoice.assign_project",
	"invoice.split",
	"invoice.submit_approval",
	"invoice.approve",
	"invoice.archive",
	"invoice.mark_paid",
] as const;

export type TgemPermission = (typeof TGEM_PERMISSIONS)[number];

export const TGEM_BASIC_MEMBER_PERMISSIONS = [
	"invoice.view",
	"invoice.edit_basic",
	"invoice.assign_project",
	"invoice.submit_approval",
] as const satisfies readonly TgemPermission[];

export const TGEM_APPROVER_PERMISSIONS = [
	"invoice.view",
	"invoice.approve",
] as const satisfies readonly TgemPermission[];

export const TGEM_ADMINISTRATOR_PERMISSIONS = TGEM_PERMISSIONS;

const TGEM_PERMISSION_SET = new Set<string>(TGEM_PERMISSIONS);

export function normalizeTgemPermissions(values: readonly string[]) {
	return Array.from(
		new Set(
			values.filter((value): value is TgemPermission =>
				TGEM_PERMISSION_SET.has(value),
			),
		),
	).sort();
}

export function hasTgemPermission(
	permissions: ReadonlySet<TgemPermission> | readonly TgemPermission[],
	permission: TgemPermission,
) {
	return permissions instanceof Set
		? permissions.has(permission)
		: permissions.includes(permission);
}
