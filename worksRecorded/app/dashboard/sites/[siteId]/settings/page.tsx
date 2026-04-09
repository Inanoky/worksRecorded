
// export const revalidate = 0

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadImageForm } from "@/components/settings/UploadImageForm";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { prisma } from "@/lib/utils/db";

import { ConfirmDeleteSite } from "@/components/settings/ConfirmDeleteSite";

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";

import { getUserData } from "@/server/actions/settings-actions";

import {

  getReminderTimes,
  getDataForReminderTable,
} from "@/server/actions/reminder-actions";
import { BisIntegrationCard } from "@/components/settings/BisIntegrationCard";
import {
  fetchBisAvailableCases,
  getSiteBisConfig,
  getUserBisTokenByUserId,
} from "@/server/actions/BIS/service";
import { UpdateSiteForm } from "./updatesiteform";
import { getSiteSettingsMessages } from "@/lib/dashboard-i18n";

export default async function SettingsSiteRoute({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { siteId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const user = await requireUser();
  const siteCheck = await orgCheck(user.id, siteId);

  if (!siteCheck) {
    notFound();
  }

  const orgId = await getOrganizationIdByUserId(user.id);
  const organizationLanguage = await getOrganizationLanguageByUserId(user.id);
  const t = getSiteSettingsMessages(organizationLanguage);

  const [
    userData,
    site,
    siteBisConfig,
    settings,
    remindersData,
    reminderTimes,
    bisToken,
  ] = await Promise.all([
    getUserData(orgId),
    prisma.site.findUnique({
      where: { id: siteId },
    }),
    getSiteBisConfig(siteId),
    prisma.sitediarysettings.findUnique({
      where: { siteId },
      select: { fileUrl: true, schema: true },
    }),
    getDataForReminderTable(orgId),
    getReminderTimes(orgId),
    getUserBisTokenByUserId(user.id),
  ]);

  console.log(`this is page.tsx ${remindersData}`);
  console.log(remindersData);

  const isBisConnected = Boolean(bisToken?.accessToken);

  let availableBisCases: Array<{
    id: string;
    caseNumber: string | null;
    constructionName: string | null;
    stageName: string | null;
  }> = [];

  if (isBisConnected) {
    try {
      availableBisCases = await fetchBisAvailableCases(bisToken.accessToken);
    } catch (error) {
      console.error("Failed to load BIS cases", error);
    }
  }

  const bisStatus = Array.isArray(resolvedSearchParams.bis)
    ? resolvedSearchParams.bis[0]
    : resolvedSearchParams.bis;

  const bisMessage = Array.isArray(resolvedSearchParams.message)
    ? resolvedSearchParams.message[0]
    : resolvedSearchParams.message;

  const parsedPolygon = (() => {
    const toPoints = (value: unknown): { lat: number; lng: number }[] => {
      if (!Array.isArray(value)) return [];

      return value
        .map((point) => {
          if (!point || typeof point !== "object") return null;
          const candidate = point as { lat?: unknown; lng?: unknown };
          if (
            typeof candidate.lat !== "number" ||
            typeof candidate.lng !== "number"
          ) {
            return null;
          }
          return { lat: candidate.lat, lng: candidate.lng };
        })
        .filter(
          (point): point is { lat: number; lng: number } => Boolean(point)
        );
    };

    const fromFeature = (value: unknown): { lat: number; lng: number }[] => {
      if (!value || typeof value !== "object") return [];
      const geometry = (
        value as { geometry?: { type?: unknown; coordinates?: unknown } }
      ).geometry;
      if (
        !geometry ||
        geometry.type !== "Polygon" ||
        !Array.isArray(geometry.coordinates)
      ) {
        return [];
      }

      const ring = geometry.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 4) return [];

      return ring
        .slice(0, -1)
        .map((coordinate) => {
          if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
          const [lng, lat] = coordinate;
          if (typeof lat !== "number" || typeof lng !== "number") return null;
          return { lat, lng };
        })
        .filter(
          (point): point is { lat: number; lng: number } => Boolean(point)
        );
    };

    const raw = site?.geofencePolygon;

    if (Array.isArray(raw)) {
      return toPoints(raw);
    }

    if (raw && typeof raw === "object") {
      const points = fromFeature(raw);
      return points.length > 0 ? points : toPoints(raw);
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return toPoints(parsed);
        if (parsed && typeof parsed === "object") {
          const points = fromFeature(parsed);
          if (points.length > 0) return points;
          return toPoints(parsed);
        }
      } catch {
        return [];
      }
    }

    return [];
  })();

  console.log("[SettingsSiteRoute] geofence debug", {
    siteId,
    geofencePolygonRaw: site?.geofencePolygon ?? null,
    parsedPolygonCount: parsedPolygon.length,
    parsedPolygonFirstPoint: parsedPolygon[0] ?? null,
    geofenceMapLink: site?.geofenceMapLink ?? null,
  });

  const statusMessageMap: Record<string, string> = {
    connected: `${t.bisIntegration}: OK`,
    disconnected: t.disconnectNote,
    "case-selected": t.saveBisCase,
    error: bisMessage
      ? `BIS connection failed: ${bisMessage}`
      : "BIS connection failed.",
  };

  const statusMessage = bisStatus ? statusMessageMap[bisStatus] ?? null : null;

  return (
    <>
      <div className="flex items-center gap-x-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/sites/${siteId}/analytics`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h3 className="text-xl font-semibold">{t.goBack}</h3>
      </div>

      <UploadImageForm siteId={siteId} />

      <BisIntegrationCard
        organizationLanguage={organizationLanguage}
        siteId={siteId}
        isConnected={isBisConnected}
        selectedCase={{
          id: siteBisConfig?.bisCaseId ?? null,
          caseNumber: siteBisConfig?.bisCaseNumber ?? null,
          name: siteBisConfig?.bisCaseName ?? null,
          stage: siteBisConfig?.bisCaseStage ?? null,
        }}
        availableCases={availableBisCases}
        statusMessage={statusMessage}
        hasManualAuthorizationCode={Boolean(
          process.env.BIS_AUTHORIZATION_CODE
        )}
      />

      <UpdateSiteForm
        organizationLanguage={organizationLanguage}
        siteId={siteId}
        site={{
          name: site?.name ?? "",
          description: site?.description ?? "",
          subdirectory: site?.subdirectory ?? "",
          geofenceMapLink: site?.geofenceMapLink ?? "",
        }}
        parsedPolygon={parsedPolygon}
      />

      <Card className="border-red-500 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-500">{t.danger}</CardTitle>
          <CardDescription>
            {t.dangerDescription}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <ConfirmDeleteSite siteId={siteId} organizationLanguage={organizationLanguage} />
        </CardFooter>
      </Card>
    </>
  );
}
