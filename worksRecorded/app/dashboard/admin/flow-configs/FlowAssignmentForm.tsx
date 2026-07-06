"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { FlowModuleDefinition } from "@/lib/flows/types";
import {
  assignFlowToOrganizationAction,
  type AssignFlowState,
} from "./actions";

type OrganizationOption = {
  id: string;
  name: string;
  _count: {
    sites: number;
    users: number;
  };
};

export function FlowAssignmentForm({
  organizations,
  modules,
}: {
  organizations: OrganizationOption[];
  modules: FlowModuleDefinition[];
}) {
  const [state, formAction] = useActionState<AssignFlowState, FormData>(
    assignFlowToOrganizationAction,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      return;
    }
    toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <OrganizationSelect organizations={organizations} />
      <FlowModuleSelect modules={modules} />
      <SaveButton />
    </form>
  );
}

function OrganizationSelect({ organizations }: { organizations: OrganizationOption[] }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted-foreground">Organization</span>
      <select
        name="organizationId"
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="">Select organization...</option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name} - {organization._count.sites} sites - {organization._count.users} users
          </option>
        ))}
      </select>
    </label>
  );
}

function FlowModuleSelect({ modules }: { modules: FlowModuleDefinition[] }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted-foreground">Flow module</span>
      <select
        name="flowModuleKey"
        defaultValue="default-construction"
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {modules.map((module) => (
          <option key={module.key} value={module.key}>
            {module.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Saving...
        </span>
      ) : (
        "Save assignment"
      )}
    </Button>
  );
}
