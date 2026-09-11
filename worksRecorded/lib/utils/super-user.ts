import { SUPER_USER_IDS } from "@/lib/production-flow/config";

export function isSuperUserId(userId: string | null | undefined) {
	if (!userId) return false;

	const configuredSuperAdminId = process.env.SUPERADMIN?.trim();
	return (
		SUPER_USER_IDS.some((superUserId) => superUserId === userId) ||
		Boolean(configuredSuperAdminId && userId === configuredSuperAdminId)
	);
}
