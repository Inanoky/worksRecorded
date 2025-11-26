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
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { redirect } from "next/navigation";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard } from "@/components/joyride/JoyRideSteps";

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

export default async function Welcome() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTour: true },
  });

  const tour = dbUser?.userTour as Record<string, any> | null;
  const isFirstTime =
    !tour || (typeof tour === "object" && Object.keys(tour).length === 0);

  // 👉 if this is NOT first time, immediately redirect to dashboard
  if (!isFirstTime) {
    redirect("/dashboard");
  }

  // 👇 This is FIRST TIME → stay on welcome page
  const orgId = await getOrganizationIdByUserId(user.id);
  const { sites } = await getData(orgId);

  return (
    <>
      <TourRunner steps={steps_dashboard} stepName="steps_dashboard" />

      <div className="flex w-full justify-end">
        <Button asChild>
          <Link href={"/dashboard/sites/new"} data-tour="create-project">
            <PlusCircle className="mr-2 size-4" /> Create Project
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="mb-5 text-2xl font-semibold">Your Sites</h1>

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
            title="You dont have any Projects created"
            description="You currently dont have any Projects. Please create some so that you can see them right here."
            href="/dashboard/sites/new"
            buttonText="Create Project"
          />
        )}
      </div>
    </>
  );
}
