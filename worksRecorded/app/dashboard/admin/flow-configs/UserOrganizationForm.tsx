"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type SwitchUserOrganizationState,
  switchUserOrganizationAction,
} from "./actions";

type OrganizationOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  organization: {
    name: string;
  } | null;
};

export function UserOrganizationForm({
  organizations,
  users,
}: {
  organizations: OrganizationOption[];
  users: UserOption[];
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [state, formAction] = useActionState<
    SwitchUserOrganizationState,
    FormData
  >(switchUserOrganizationAction, null);
  const selectedUser = users.find((user) => user.id === selectedUserId);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setSelectedUserId("");
      return;
    }
    toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="text-xs text-muted-foreground">User</span>
        <select
          name="userId"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Select user...</option>
          {users.map((user) => {
            const name = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ");
            const currentOrganization =
              user.organization?.name ?? "No organization";

            return (
              <option key={user.id} value={user.id}>
                {name ? `${name} - ` : ""}
                {user.email} - {currentOrganization}
              </option>
            );
          })}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-xs text-muted-foreground">New organization</span>
        <select
          key={selectedUserId}
          name="organizationId"
          defaultValue=""
          disabled={!selectedUser}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select organization...</option>
          {organizations.map((organization) => (
            <option
              key={organization.id}
              value={organization.id}
              disabled={organization.id === selectedUser?.organizationId}
            >
              {organization.name}
              {organization.id === selectedUser?.organizationId
                ? " (current)"
                : ""}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs text-muted-foreground">
        This changes the user&apos;s organization access. Existing sites and
        records are not moved.
      </p>

      <SwitchButton disabled={!selectedUser} />
    </form>
  );
}

function SwitchButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Switching...
        </span>
      ) : (
        "Switch organization"
      )}
    </Button>
  );
}
