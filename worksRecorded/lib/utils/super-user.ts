import { FLOW_CONFIG_ADMIN_USER_ID } from "@/lib/production-flow/config";

export function isSuperUserId(userId: string | null | undefined) {
  if (!userId) return false;

  const configuredSuperAdminId = process.env.SUPERADMIN?.trim();
  return (
    userId === FLOW_CONFIG_ADMIN_USER_ID ||
    Boolean(configuredSuperAdminId && userId === configuredSuperAdminId)
  );
}
