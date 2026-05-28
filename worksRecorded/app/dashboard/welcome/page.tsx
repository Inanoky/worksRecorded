import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PhoneRequiredDialog } from "@/components/dashboard/PhoneRequiredDialog";
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import { saveUserPhone } from "@/server/actions/shared-actions";

async function getData(orgId: string) {
  const [sites] = await Promise.all([
    prisma.site.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return { sites };
}

async function setPhone(formData: FormData) {
  "use server";
  await saveUserPhone(formData);
  redirect("/dashboard/welcome");
}

export default async function Welcome() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTour: true, phone: true },
  });

  const tour = dbUser?.userTour as Record<string, unknown> | null;
  const isFirstTime =
    !tour || (typeof tour === "object" && Object.keys(tour).length === 0);

  const needsPhone = !dbUser?.phone;

  // Only return users with a completed onboarding step to dashboard.
  // If phone is still missing, stay on welcome to show the phone-required dialog.
  if (!needsPhone && !isFirstTime) {
    redirect("/dashboard");
  }

  const hasSelectedOnboardingLanguage = Boolean((tour as Record<string, unknown> | null)?.onboardingLanguageSelected);

  if (!needsPhone) {
    if (!hasSelectedOnboardingLanguage) {
      redirect("/dashboard/welcome/language");
    }
  }

  const orgId = await getOrganizationIdByUserId(user.id);
  if (!orgId) {
    redirect("/dashboard");
  }

  const organizationLanguage = await getOrganizationLanguageByUserId(user.id);
  const t = getDashboardMessages(organizationLanguage);
  const { sites } = await getData(orgId);

  return (
    <>
      {/* Force phone number BEFORE tour + usage */}
      <PhoneRequiredDialog needsPhone={needsPhone} action={setPhone} />

      {/* Tour only runs after phone is set */}
      {!needsPhone && (
        <TourRunner steps={getJoyRideSteps(organizationLanguage).steps_dashboard} stepName="steps_dashboard" />
      )}

      <div className="flex w-full justify-end">
        <Button asChild>
          <Link href={"/dashboard/sites/new"} data-tour="create-project">
            <PlusCircle className="mr-2 size-4" /> {t.createProject}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="mb-5 text-2xl font-semibold">{t.yourSites}</h1>

        {sites.length > 0 ? (
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {sites.map((item) => (
              <Card
                key={item.id}
                className="flex h-full min-h-[380px] flex-col pt-0"
              >
                <Image
                  src={item.imageUrl ?? DefaultImage}
                  alt={item.name}
                  className="h-[200px] w-full rounded-t-lg object-cover"
                  width={400}
                  height={200}
                />

                <CardHeader>
                  <CardTitle className="truncate">{item.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardFooter>
                  <OpenProjectButton
                    projectId={item.id}
                    projectName={item.name}
                  />
                </CardFooter>
              </Card>
            ))}
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
