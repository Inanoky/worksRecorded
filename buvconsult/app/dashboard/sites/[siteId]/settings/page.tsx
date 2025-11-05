import InvoiceUpload from "@/components/settings/InvoiceUpload";
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
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { UploadImageForm } from "@/components/settings/UploadImageForm";
import { getOrganizationIdByUserId, updateSiteAction } from "@/server/actions/shared-actions";
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


export default async function SettingsSiteRoute({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {


  const { siteId } = await params
  const user = await requireUser();
  const siteCheck = await orgCheck(user.id, siteId);
  if (!siteCheck) {
  notFound();
    }

  const orgId = await getOrganizationIdByUserId(user.id)
  const userData = await getUserData(orgId)


  // Fetch current site data
  const site = await prisma.site.findUnique({
    where: { id: siteId },
  });

  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { fileUrl: true, schema: true },
  });

  return (
    <>
      {/* Back Button */}
      <div className="flex items-center gap-x-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/sites/${siteId}/analytics`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h3 className="text-xl font-semibold">Go Back</h3>
      </div>

      <UploadImageForm siteId={siteId} />

      {/* Edit Site Info Card */}
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
              <label
                className="block mb-1 text-sm font-medium"
                htmlFor="name"
              >
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
          </div>
          <CardFooter>
            <SubmitButton text="Save Changes" />
          </CardFooter>
        </form>
      </Card>

      {/* Upload Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Upload invoices here</CardTitle>
        </CardHeader>
        <InvoiceUpload params={Promise.resolve({ siteId })} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents here</CardTitle>
        </CardHeader>
        <DocumentUpload params={Promise.resolve({ siteId })} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Please, upload programm</CardTitle>
        </CardHeader>
        <XslxUpload params={Promise.resolve({ siteId })} />
      </Card>

      <TemplateCard />

      <SchemaCard
        siteId={siteId}
        fileUrl={settings?.fileUrl ?? null}
        schemaExists={!!settings?.schema}
      />

      {/* Danger Card */}
      <Card className="border-red-500 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-red-500">Danger</CardTitle>
          <CardDescription>
            This will delete your site and all articles associated with it.
            Click the button below to delete everything.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <ConfirmDeleteSite siteId={siteId} />
        </CardFooter>
      </Card>

      <MembersTable pageSize={5} data={userData} exportFileName="Members" userid={user.id} orgId={orgId} />
    </>
  );
}
