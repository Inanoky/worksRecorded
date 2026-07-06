"use server";

import { prisma } from "@/lib/utils/db";
import {
  DEFAULT_PRODUCTION_FLOW_CONFIG,
  PRODUCTION_FLOW_CONFIGS,
  type ProductionFlowConfig,
} from "@/lib/production-flow/config";
import {
  getFlowModuleByKey,
  getFlowModuleByProductionConfigKey,
} from "@/lib/flows/registry";
import { getFlowAssignmentForOrganization } from "@/lib/flows/assignments-server";

type OverrideRow = {
  key: string;
  config: unknown;
  updatedAt: Date;
};

const TABLE_NAME = '"ProductionFlowConfigOverride"';

async function ensureFlowConfigOverrideTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      "key" TEXT PRIMARY KEY,
      "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function boolRecord(
  value: unknown,
  fallback: ProductionFlowConfig["features"],
): ProductionFlowConfig["features"] {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    drawings: typeof raw.drawings === "boolean" ? raw.drawings : fallback.drawings,
    pause: typeof raw.pause === "boolean" ? raw.pause : fallback.pause,
    productivityExport:
      typeof raw.productivityExport === "boolean"
        ? raw.productivityExport
        : fallback.productivityExport,
    payrollExport:
      typeof raw.payrollExport === "boolean" ? raw.payrollExport : fallback.payrollExport,
    additionalWorks:
      typeof raw.additionalWorks === "boolean" ? raw.additionalWorks : fallback.additionalWorks,
  };
}

function mergeProductionFlowConfig(
  base: ProductionFlowConfig,
  override: unknown,
): ProductionFlowConfig {
  const raw = override && typeof override === "object" ? (override as Record<string, any>) : {};
  const labels = raw.labels && typeof raw.labels === "object" ? raw.labels : {};
  const navigation = raw.navigation && typeof raw.navigation === "object" ? raw.navigation : {};
  const whatsapp = raw.whatsapp && typeof raw.whatsapp === "object" ? raw.whatsapp : {};
  const strategies = raw.strategies && typeof raw.strategies === "object" ? raw.strategies : {};
  const additionalWorks =
    raw.additionalWorks && typeof raw.additionalWorks === "object" ? raw.additionalWorks : {};
  const coefficients = raw.coefficients && typeof raw.coefficients === "object" ? raw.coefficients : {};
  const coefficientRows = Array.isArray(coefficients.rows)
    ? coefficients.rows
        .map((row: any) => ({
          code: String(row?.code ?? "").trim(),
          task: String(row?.task ?? "").trim(),
          defaultRate: String(row?.defaultRate ?? "").trim(),
          unit: String(row?.unit ?? "").trim() || "x",
        }))
        .filter((row) => row.code && row.task && row.defaultRate)
    : base.coefficients.rows;

  return {
    ...base,
    baseFlowKey:
      typeof raw.baseFlowKey === "string" && raw.baseFlowKey.trim()
        ? raw.baseFlowKey.trim()
        : base.baseFlowKey,
    flowModuleKey:
      typeof raw.flowModuleKey === "string" && getFlowModuleByKey(raw.flowModuleKey)
        ? getFlowModuleByKey(raw.flowModuleKey)?.key ?? base.flowModuleKey
        : getFlowModuleByProductionConfigKey(
            typeof raw.baseFlowKey === "string" ? raw.baseFlowKey : base.baseFlowKey,
          )?.key ?? base.flowModuleKey,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : base.description,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : base.enabled,
    isDefault: typeof raw.isDefault === "boolean" ? raw.isDefault : base.isDefault,
    organizationIds: Array.isArray(raw.organizationIds)
      ? stringArray(raw.organizationIds)
      : base.organizationIds,
    siteIds: Array.isArray(raw.siteIds) ? stringArray(raw.siteIds) : base.siteIds,
    labels: {
      navigationTitle:
        typeof labels.navigationTitle === "string" && labels.navigationTitle.trim()
          ? labels.navigationTitle.trim()
          : base.labels.navigationTitle,
      navigationTitleLv:
        typeof labels.navigationTitleLv === "string" && labels.navigationTitleLv.trim()
          ? labels.navigationTitleLv.trim()
          : base.labels.navigationTitleLv,
      journalTitle:
        typeof labels.journalTitle === "string" && labels.journalTitle.trim()
          ? labels.journalTitle.trim()
          : base.labels.journalTitle,
      ratesTitle:
        typeof labels.ratesTitle === "string" && labels.ratesTitle.trim()
          ? labels.ratesTitle.trim()
          : base.labels.ratesTitle,
    },
    features: boolRecord(raw.features, base.features),
    navigation: {
      hiddenProjectNavPaths: Array.isArray(navigation.hiddenProjectNavPaths)
        ? stringArray(navigation.hiddenProjectNavPaths)
        : base.navigation.hiddenProjectNavPaths,
    },
    coefficients: {
      rows: coefficientRows,
    },
    whatsapp: {
      pauseCommand:
        typeof whatsapp.pauseCommand === "string" && whatsapp.pauseCommand.trim()
          ? whatsapp.pauseCommand.trim()
          : base.whatsapp.pauseCommand,
      resumeCommand:
        typeof whatsapp.resumeCommand === "string" && whatsapp.resumeCommand.trim()
          ? whatsapp.resumeCommand.trim()
          : base.whatsapp.resumeCommand,
      changeProjectCommands: Array.isArray(whatsapp.changeProjectCommands)
        ? stringArray(whatsapp.changeProjectCommands)
        : base.whatsapp.changeProjectCommands,
    },
    strategies: {
      whatsappWorker:
        strategies.whatsappWorker === "ztc-worker-v1"
          ? "ztc-worker-v1"
          : strategies.whatsappWorker === "legacy-worker-v1"
            ? "legacy-worker-v1"
            : base.strategies.whatsappWorker,
      whatsappQuality:
        strategies.whatsappQuality === "ztc-quality-v1"
          ? "ztc-quality-v1"
          : strategies.whatsappQuality === "none"
            ? "none"
            : base.strategies.whatsappQuality,
    },
    additionalWorks: {
      mode:
        additionalWorks.mode === "ztc-element-aware" ? "ztc-element-aware" : "default",
    },
  };
}

function getBaseConfigForOverride(row: OverrideRow) {
  const raw = row.config && typeof row.config === "object" ? (row.config as Record<string, unknown>) : {};
  const baseFlowKey = typeof raw.baseFlowKey === "string" ? raw.baseFlowKey.trim() : "";

  return (
    PRODUCTION_FLOW_CONFIGS.find((config) => config.key === baseFlowKey) ??
    DEFAULT_PRODUCTION_FLOW_CONFIG
  );
}

async function getOverrideRows() {
  await ensureFlowConfigOverrideTable();
  return prisma.$queryRawUnsafe<OverrideRow[]>(`
    SELECT "key", "config", "updatedAt"
    FROM ${TABLE_NAME}
    ORDER BY "key" ASC
  `);
}

export async function getMergedProductionFlowConfigs() {
  const rows = await getOverrideRows();
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const configs = PRODUCTION_FLOW_CONFIGS.map((base) =>
    mergeProductionFlowConfig(base, rowsByKey.get(base.key)?.config),
  );
  const knownKeys = new Set(configs.map((config) => config.key));

  for (const row of rows) {
    if (knownKeys.has(row.key)) continue;
    const base = getBaseConfigForOverride(row);
    configs.push(
      mergeProductionFlowConfig(
        {
          ...base,
          key: row.key,
          name: row.key,
          description: "Custom production flow config.",
          isDefault: false,
        },
        row.config,
      ),
    );
  }

  return configs;
}

export async function resolveProductionFlowConfigForRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  const organizationId = args.organizationId ?? "";
  const siteId = args.siteId ?? "";
  const configs = await getMergedProductionFlowConfigs();
  const assignment = await getFlowAssignmentForOrganization(organizationId);

  if (assignment?.enabled) {
    const assignedModule = getFlowModuleByKey(assignment.flowModuleKey);
    if (assignedModule?.category !== "production" || !assignedModule.productionConfigKey) {
      return null;
    }

    const assignedConfig =
      configs.find(
        (config) =>
          config.enabled &&
          config.flowModuleKey === assignedModule.key &&
          (config.organizationIds.includes(organizationId) || config.siteIds.includes(siteId)),
      ) ??
      configs.find((config) => config.key === assignedModule.productionConfigKey);

    return assignedConfig
      ? {
          ...assignedConfig,
          isDefault: false,
          organizationIds: assignedConfig.organizationIds.includes(organizationId)
            ? assignedConfig.organizationIds
            : [organizationId],
          siteIds: siteId && !assignedConfig.siteIds.includes(siteId)
            ? [...assignedConfig.siteIds, siteId]
            : assignedConfig.siteIds,
        }
      : null;
  }

  return (
    configs.find(
      (config) =>
        !config.isDefault &&
        config.enabled &&
        (config.organizationIds.includes(organizationId) || config.siteIds.includes(siteId)),
    ) ?? null
  );
}

export async function saveProductionFlowConfigOverride(key: string, config: unknown) {
  await ensureFlowConfigOverrideTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${TABLE_NAME} ("key", "config", "updatedAt")
      VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT ("key")
      DO UPDATE SET "config" = EXCLUDED."config", "updatedAt" = CURRENT_TIMESTAMP
    `,
    key,
    JSON.stringify(config),
  );
}
