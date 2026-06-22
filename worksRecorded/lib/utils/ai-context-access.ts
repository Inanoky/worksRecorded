function parseUserIds(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function hasAiContextAccess(userId: string | null | undefined) {
  if (!userId) return false;

  const allowedUserIds = parseUserIds(process.env.AI_CONTEXT_ALLOWED_USER_IDS);
  const superAdminId = process.env.SUPERADMIN?.trim();

  return allowedUserIds.has(userId) || userId === superAdminId;
}
