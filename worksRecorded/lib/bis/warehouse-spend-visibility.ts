export function parseWarehouseSpendOrganizationIds(value = process.env.WAREHOUSE_SPEND_ORG_IDS) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function canShowWarehouseSpendInsights(args: {
  siteOrganizationId?: string | null;
  userRole?: string | null;
  configuredOrganizationIds?: Set<string>;
}) {
  const configuredOrganizationIds = args.configuredOrganizationIds ?? parseWarehouseSpendOrganizationIds();
  const siteOrganizationId = args.siteOrganizationId?.trim();
  const userRole = args.userRole?.trim().toLowerCase();

  return Boolean(
    siteOrganizationId &&
    configuredOrganizationIds.has(siteOrganizationId) &&
    userRole === "site manager"
  );
}
