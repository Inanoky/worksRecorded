// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\dashboard\page.tsx

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import DefaultImage from "@/public/default.png";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import OpenProjectButton from "@/components/providers/ButtonClient";
import { PlusCircle } from "lucide-react";
import { getOrganizationIdByUserId, getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { redirect } from "next/navigation";
import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import { resolveClientFlowForRuntime } from "@/lib/client-flows/resolve-client-flow-server";
import { CLIENT_FLOW_IDS } from "@/lib/client-flows/constants";

const SUPER_USER_IDS = new Set([process.env.SUPERADMIN]);

async function getData(orgId: string | null, isSuperUser: boolean) {
  const [sites] = await Promise.all([
    prisma.site.findMany({
      where: isSuperUser ? {} : { organizationId: orgId ?? "" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { sites };
}

export default async function DashboardIndexPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, userTour: true },
  });
  const tour = (dbUser?.userTour && typeof dbUser.userTour === "object" ? dbUser.userTour : {}) as Record<string, unknown>;;
  if (!dbUser?.phone) redirect("/dashboard/welcome");
  if (!tour.onboardingLanguageSelected) redirect("/dashboard/welcome/language");

  const isSuperUser = SUPER_USER_IDS.has(user.id);

  const org = isSuperUser ? null : await getOrganizationIdByUserId(user.id);
  const organizationLanguage = isSuperUser ? "en" : await getOrganizationLanguageByUserId(user.id);
  const t = getDashboardMessages(organizationLanguage);

  const { sites } = await getData(org, isSuperUser);
  const isZtcOrganization =
    (await resolveClientFlowForRuntime({ organizationId: org })) === CLIENT_FLOW_IDS.ZTC;
  const tourSteps = sites.length > 0
    ? getJoyRideSteps(organizationLanguage).steps_dashboard_sites_open_project
    : isZtcOrganization
      ? []
      : getJoyRideSteps(organizationLanguage).steps_dashboard_create_project_cta;
  const tourStepName = sites.length > 0
    ? "steps_dashboard_sites_open_project"
    : "steps_dashboard_create_project_cta";

  return (
    <>
      {tourSteps.length ? (
        <TourRunner steps={tourSteps} stepName={tourStepName} />
      ) : null}

      {!isZtcOrganization ? (
        <div className="flex w-full justify-end">
          <Button asChild>
            <Link href={"/dashboard/sites/new"} data-tour="create-project">
              <PlusCircle className="mr-2 size-4" /> {t.createProject}
            </Link>
          </Button>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold mb-5">{t.yourSites}</h1>

        {sites.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr">
            {sites.map((item) => (
              <Card key={item.id} className="pt-0 flex flex-col h-full min-h-[380px]">
                <Image
                  src={item.imageUrl ?? DefaultImage}
                  alt={item.name}
                  className="rounded-t-lg object-cover w-full h-[200px]"
                  width={400}
                  height={200}
                />
                <CardHeader>
                  <CardTitle className="truncate">{item.name}</CardTitle>
                  <CardDescription className="line-clamp-3">{item.description}</CardDescription>
                </CardHeader>

                <CardFooter data-tour="dashboard/page">
                  <OpenProjectButton
                    projectId={item.id}
                    projectName={item.name}
                    label={t.openProject}
                    loadingLabel={t.openingProject}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : isZtcOrganization ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
            <h2 className="mt-2 text-xl font-semibold">{t.emptyTitle}</h2>
            <p className="mt-2 max-w-sm text-center text-sm leading-tight text-muted-foreground">
              {t.emptyDescription}
            </p>
          </div>
        ) : (
          <EmptyState
            title={t.emptyTitle}
            description={t.emptyDescription}
            href="/dashboard/sites/new"
            buttonText={t.createProject}
          />
        )}
      </div>
    </>
  );
}
