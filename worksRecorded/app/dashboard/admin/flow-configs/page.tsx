import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFlowAssignments } from "@/lib/flows/assignments-server";
import { getFlowModuleByKey, getFlowModules } from "@/lib/flows/registry";
import type { FlowModuleDefinition } from "@/lib/flows/types";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { FlowAssignmentForm } from "./FlowAssignmentForm";
import { UserOrganizationForm } from "./UserOrganizationForm";

export default async function FlowConfigsPage() {
  const user = await requireUser();
  const requestHeaders = await headers();
  if (
    !canAccessFlowConfigAdmin(
      user.id,
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    )
  ) {
    notFound();
  }

  const [organizations, assignments, users] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            sites: true,
            users: true,
          },
        },
      },
    }),
    getFlowAssignments(),
    prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        organization: {
          select: { name: true },
        },
      },
    }),
  ]);
  const flowModules = getFlowModules();
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-blue-600" />
            <h1 className="text-2xl font-semibold tracking-tight">Flow configs</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Assign registered flow modules to organizations.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {assignments.length} assignments
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current assignments</CardTitle>
              <CardDescription>One organization can point to one active flow module</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length ? (
                assignments.map((assignment) => {
                  const organization = organizationsById.get(assignment.organizationId);
                  const module = getFlowModuleByKey(assignment.flowModuleKey);

                  return (
                    <div
                      key={assignment.organizationId}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {organization?.name ?? assignment.organizationId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {organization?._count.sites ?? 0} sites - {organization?._count.users ?? 0} users
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={assignment.enabled ? "default" : "secondary"}>
                          {assignment.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="outline">{module?.name ?? assignment.flowModuleKey}</Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No explicit flow assignments yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available flow modules</CardTitle>
              <CardDescription>Registered frontend/backend entry points</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {flowModules.map((module) => (
                <FlowModuleCard key={module.key} module={module} />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign flow</CardTitle>
              <CardDescription>Choose organization and flow module</CardDescription>
            </CardHeader>
            <CardContent>
              <FlowAssignmentForm organizations={organizations} modules={flowModules} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Switch user organization</CardTitle>
              <CardDescription>Choose a user and their new organization</CardDescription>
            </CardHeader>
            <CardContent>
              <UserOrganizationForm organizations={organizations} users={users} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FlowModuleCard({ module }: { module: FlowModuleDefinition }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold">{module.name}</div>
        <Badge variant="outline">{module.category}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {module.configurableAreas.map((area) => (
          <Badge key={area} variant="secondary">
            {area}
          </Badge>
        ))}
      </div>
    </div>
  );
}
