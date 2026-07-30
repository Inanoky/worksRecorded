"use server";

import { revalidatePath } from "next/cache";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY } from "@/flows/default-construction/lib/forma2-work-options-manifest";
import { reconcileForma2WorkManifestAfterOptionsSave } from "@/flows/default-construction/lib/forma2-work-options-sync";
import {
  DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY,
  type DefaultConstructionWorkProductivitySetting,
  getDefaultConstructionOptionValues,
  normalizeDefaultConstructionWorkSettings,
} from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

const MAX_OPTION_LENGTH = 200;

function normalizeSimpleOptions(input: string[], label: string) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const value = String(raw ?? "").trim();
    if (!value) throw new Error(`${label} cannot be empty`);
    if (value.length > MAX_OPTION_LENGTH) {
      throw new Error(
        `${label} must be ${MAX_OPTION_LENGTH} characters or less`,
      );
    }
    const key = value.toLocaleLowerCase("lv");
    if (seen.has(key)) throw new Error(`${label} already exists: ${value}`);
    seen.add(key);
    result.push(value);
  }

  return result;
}

async function readAuthorizedConfig(siteId: string) {
  const user = await requireUser();
  await orgCheck(user.id, siteId);
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { siteDiaryRecordsMap: true },
  });
  if (!site) throw new Error("Site not found");

  const config =
    site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? structuredClone(site.siteDiaryRecordsMap as Record<string, any>)
      : structuredClone(defaultConfig as Record<string, any>);
  return config;
}

export async function getDefaultConstructionSiteDiaryOptions(siteId: string) {
  const config = await readAuthorizedConfig(siteId);
  return getDefaultConstructionOptionValues(config);
}

export async function saveDefaultConstructionSiteDiaryOptions(args: {
  siteId: string;
  locations: string[];
  works: DefaultConstructionWorkProductivitySetting[];
}) {
  const config = await readAuthorizedConfig(args.siteId);
  const locations = normalizeSimpleOptions(args.locations, "Location");
  const works = normalizeDefaultConstructionWorkSettings(args.works);
  const forma2Manifest = reconcileForma2WorkManifestAfterOptionsSave(
    config,
    works,
  );

  if (!locations.length || !works.length) {
    throw new Error("At least one location and one work are required");
  }

  config.Location = {
    ...(config.Location ?? (defaultConfig as Record<string, any>).Location),
    DropDownOptions: Object.fromEntries(
      locations.map((value) => [value, value]),
    ),
  };
  config.Works = {
    ...(config.Works ?? (defaultConfig as Record<string, any>).Works),
    DropDownOptions: Object.fromEntries(works.map(({ work }) => [work, work])),
  };
  const otherSettings = {
    ...(config.otherSettings ?? {}),
    [DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY]: {
      version: 4,
      works,
    },
  };
  if (forma2Manifest) {
    otherSettings[DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY] = forma2Manifest;
  }
  config.otherSettings = otherSettings;

  await prisma.site.update({
    where: { id: args.siteId },
    data: { siteDiaryRecordsMap: config },
  });

  revalidatePath(`/dashboard/sites/${args.siteId}/dashboard`);
  revalidatePath(`/dashboard/sites/${args.siteId}/siteDiary`);
  revalidatePath(`/dashboard/sites/${args.siteId}/analytics`);

  return getDefaultConstructionOptionValues(config);
}
