import { prisma } from "@/lib/utils/db";
import {
  normalizeZtcProjectName,
  resolveZtcCanonicalProjectName,
} from "@/flows/ztc-production/lib/ztc-project-name";
import { ZTC_ALL_PROJECTS_RATE_NAME } from "@/flows/ztc-production/lib/ztc-rate-constants";

function getManualProjectNames(config: unknown) {
  const root =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : null;
  const otherSettings =
    root?.otherSettings && typeof root.otherSettings === "object"
      ? (root.otherSettings as Record<string, unknown>)
      : null;
  const rawRates = otherSettings?.ztcDefaultTaskRates;
  const rateContainer =
    rawRates && typeof rawRates === "object" && !Array.isArray(rawRates)
      ? (rawRates as Record<string, unknown>)
      : null;
  const projects = Array.isArray(rawRates)
    ? rawRates
    : Array.isArray(rateContainer?.projects)
      ? rateContainer.projects
      : [];

  return projects
    .map((project) =>
      project && typeof project === "object"
        ? (project as Record<string, unknown>)
        : null,
    )
    .filter(
      (project): project is Record<string, unknown> => project?.manual === true,
    )
    .map((project) => String(project.projectName ?? "").trim())
    .filter(
      (projectName) =>
        projectName &&
        normalizeZtcProjectName(projectName) !==
          normalizeZtcProjectName(ZTC_ALL_PROJECTS_RATE_NAME),
    );
}

export async function canonicalizeZtcExtractedProjectName(args: {
  siteId: string;
  extractedProjectName: unknown;
}) {
  const [site, existingRows] = await Promise.all([
    prisma.site.findUnique({
      where: { id: args.siteId },
      select: { siteDiaryRecordsMap: true },
    }),
    prisma.ztcRecords.findMany({
      where: { siteId: args.siteId, Location: { not: null } },
      select: { Location: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const resolution = resolveZtcCanonicalProjectName({
    extractedProjectName: args.extractedProjectName,
    manualProjectNames: getManualProjectNames(site?.siteDiaryRecordsMap),
    existingProjectNames: existingRows
      .map((row) => String(row.Location ?? "").trim())
      .filter(
        (projectName) =>
          projectName && normalizeZtcProjectName(projectName) !== "papilddarbi",
      ),
  });

  console.log("ZTC project name canonicalized", {
    siteId: args.siteId,
    extractedProjectName: normalizeZtcProjectName(args.extractedProjectName),
    canonicalProjectName: resolution.projectName,
    source: resolution.source,
  });

  return resolution.projectName;
}
