import InvoiceUpload from "@/components/settings/InvoiceUpload";
// export const revalidate = 0
import GeoMap from "@/components/settings/geomap";

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
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { UploadImageForm } from "@/components/settings/UploadImageForm";
import {
  getOrganizationIdByUserId,
  updateSiteAction,
} from "@/server/actions/shared-actions";
import { prisma } from "@/lib/utils/db";
import DocumentUpload from "@/components/documents/DocumentsUpload";
import XslxUpload from "@/components/settings/XlsxUpload";
import { SchemaCard } from "@/components/settings/SchemaCard";
import { TemplateCard } from "@/components/settings/Templates";
import { ConfirmDeleteSite } from "@/components/settings/ConfirmDeleteSite";

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";
import { MembersTable } from "@/components/settings/MembersTable";
import { getUserData } from "@/server/actions/settings-actions";
import TourRunner from "@/components/joyride/TourRunner";

import Reminder from "@/components/settings/ReminderUI";
import {
  getRemindersData,
  getReminderTimes,
  getDataForReminderTable,
} from "@/server/actions/reminder-actions";
import { BisIntegrationCard } from "@/components/settings/BisIntegrationCard";
import {
  fetchBisAvailableCases,
  getSiteBisConfig,
  getUserBisTokenByUserId,
} from "@/server/actions/BIS/service";
import { SettingsSavedToast } from "@/components/settings/SettingsSavedToast";

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
  const saveStatus = Array.isArray(resolvedSearchParams.saved)
    ? resolvedSearchParams.saved[0]
    : resolvedSearchParams.saved;

  const statusMessageMap: Record<string, string> = {
    connected: "BIS authorization completed successfully.",
    disconnected:
      "BIS access tokens were removed and this site's BIS case selection was cleared. Existing BIS-linked records were kept.",
    "case-selected": "BIS case was saved for this site.",
    error: bisMessage
      ? `BIS connection failed: ${bisMessage}`
      : "BIS connection failed.",
  };

  const statusMessage = bisStatus ? statusMessageMap[bisStatus] ?? null : null;

  return (
    <>
      <SettingsSavedToast shouldShow={saveStatus === "1"} />
      <div className="flex items-center gap-x-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/sites/${siteId}/analytics`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h3 className="text-xl font-semibold">Go Back</h3>
      </div>

      <UploadImageForm siteId={siteId} />

      <BisIntegrationCard
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Edit Site Info</CardTitle>
          <CardDescription>
            Update your site’s name, description, or subdirectory.
          </CardDescription>
        </CardHeader>

        <form action={updateSiteAction}>
          <input type="hidden" name="siteId" value={siteId} />

          <div className="px-6 pb-2 flex flex-col gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-base"
                name="name"
                id="name"
                type="text"
                required
                defaultValue={site?.name || ""}
              />
            </div>

            <div>
              <label
                className="block mb-1 text-sm font-medium"
                htmlFor="description"
              >
                Description
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-base"
                name="description"
                id="description"
                type="text"
                required
                defaultValue={site?.description || ""}
              />
            </div>

            <div>
              <label
                className="block mb-1 text-sm font-medium"
                htmlFor="subdirectory"
              >
                Subdirectory
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-base"
                name="subdirectory"
                id="subdirectory"
                type="text"
                required
                defaultValue={site?.subdirectory || ""}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Site area
              </label>
              <GeoMap
                initialPolygon={
                  Array.isArray(site?.geofencePolygon)
                    ? (site.geofencePolygon as { lat: number; lng: number }[])
                    : []
                }
                initialMapLink={site?.geofenceMapLink ?? ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Draw the permitted site area for location-based worker clock-in.
              </p>
            </div>
          </div>

          <CardFooter>
            <SubmitButton text="Save Changes" />
          </CardFooter>
        </form>
      </Card>

      <Card className="border-red-500 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-500">Danger</CardTitle>
          <CardDescription>
            This will delete your site and all data associated with it.
            Click the button below to delete everything.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <ConfirmDeleteSite siteId={siteId} />
        </CardFooter>
      </Card>
    </>
  );
}
