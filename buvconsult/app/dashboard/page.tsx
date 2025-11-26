//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\dashboard\page.tsx
//06:55 - creating dashboard
// Primse.all - runs quieries in parallael

import {prisma} from "@/lib/utils/db";
import {requireUser} from "@/lib/utils/requireUser";
import {EmptyState} from "@/components/dashboard/EmptyState";
import {Card, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import Image from "next/image";
import DefaultImage from "@/public/default.png";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import OpenProjectButton from "@/components/providers/ButtonClient";
import { PlusCircle} from "lucide-react";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_sites_open_project} from "@/components/joyride/JoyRideSteps";

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

  return { sites};
}







export default async function DashboardIndexPage() {
  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id)
  const {  sites } = await getData(org);
  return (


    <>
       <TourRunner steps={steps_dashboard_sites_open_project} stepName="steps_dashboard_sites_open_project" />
    <div className="flex w-full justify-end">
            <Button asChild>
              <Link 
              href={"/dashboard/sites/new"}
             
              
              >
                <PlusCircle className="mr-2 size-4" /> Create Project
              </Link>
            </Button>
          </div>
       
    
    
    
    
    
   
    <div>
      <h1 className="text-2xl font-semibold mb-5">Your Sites</h1>
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
                <CardDescription className="line-clamp-3">
                  {item.description}
                </CardDescription>
              </CardHeader>

              <CardFooter
               data-tour="dashboard/page"
               >
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
  )

}