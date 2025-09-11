
import {Button} from "@/componentsFrontend/ui/button";
import Link from "next/link";
import Image from "next/image"
import {FileIcon, PlusCircle} from "lucide-react";
import {prisma} from "@/app/utils/db";
import {getKindeServerSession} from "@kinde-oss/kinde-auth-nextjs/server";
import {redirect} from "next/navigation";
import {Card, CardDescription, CardFooter, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import DefaultImage from "@/public/default.png"

import React from "react";
import {EmptyState} from "@/app/components/dashboard/EmptyState";
import OpenProjectButton from "@/componentsFrontend/provider/ButtonClient";


//nothing

async function getData(userId: string) {
  const data = await prisma.site.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data;
}

export default async function SitesRoute() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return redirect("/api/auth/login");
  }
  const data = await getData(user.id);
  return (
    <>
      <div className="flex w-full justify-end">
        <Button asChild>
          <Link href={"/dashboard/sites/new"}>
            <PlusCircle className="mr-2 size-4" /> Create Project
          </Link>
        </Button>
      </div>

      {data === undefined || data.length === 0 ? (
        <EmptyState
          title="You dont have any Sites created"
          description="You currently dont have any Sites. Please create some so that you can
        see them right here!"
          buttonText="Create Project"
          href="/dashboard/sites/new"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr">
          {data.map((item) => (
            <Card key={item.id} className="pt-0 flex flex-col h-full min-h-[380px]">
              <Image
                src={item.imageUrl ?? DefaultImage}
                alt={item.name}
                className="rounded-t-lg object-cover w-full h-[200px]"
                width={400}
                height={200}
              />
              <CardHeader className="pt-0">
                <CardTitle className="truncate">{item.name}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {item.description}
                </CardDescription>
              </CardHeader>

              <CardFooter>
                              <OpenProjectButton projectId={item.id} projectName={item.name} />

              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}