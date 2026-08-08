"use client";

import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
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
      setSelectedOrganizationId("");
      return;
    }
    toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="text-sm">
        <span className="text-xs text-muted-foreground">User</span>
        <SearchableSelect
          name="userId"
          value={selectedUserId}
          onChange={(value) => {
            setSelectedUserId(value);
            setSelectedOrganizationId("");
          }}
          placeholder="Select user..."
          searchPlaceholder="Search name, email, or organization..."
          emptyMessage="No users found."
          options={users.map((user) => {
            const name = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ");
            const currentOrganization =
              user.organization?.name ?? "No organization";

            return {
              value: user.id,
              label: `${name ? `${name} - ` : ""}${user.email} - ${currentOrganization}`,
            };
          })}
        />
      </div>

      <div className="text-sm">
        <span className="text-xs text-muted-foreground">New organization</span>
        <SearchableSelect
          name="organizationId"
          value={selectedOrganizationId}
          onChange={setSelectedOrganizationId}
          placeholder="Select organization..."
          searchPlaceholder="Search organizations..."
          emptyMessage="No organizations found."
          disabled={!selectedUser}
          options={organizations.map((organization) => ({
            value: organization.id,
            label: `${organization.name}${
              organization.id === selectedUser?.organizationId
                ? " (current)"
                : ""
            }`,
            disabled: organization.id === selectedUser?.organizationId,
          }))}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        This changes the user&apos;s organization access. Existing sites and
        records are not moved.
      </p>

      <SwitchButton disabled={!selectedUser || !selectedOrganizationId} />
    </form>
  );
}

type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function SearchableSelect({
  name,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  onChange,
}: {
  name: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalizedSearch),
  );

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={selectedOption?.label ?? placeholder}
            disabled={disabled}
            className="mt-1 w-full min-w-0 justify-between font-normal"
          >
            <span
              className={
                selectedOption
                  ? "min-w-0 flex-1 truncate text-left"
                  : "min-w-0 flex-1 truncate text-left text-muted-foreground"
              }
            >
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                disabled={option.disabled}
                className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left font-normal"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check
                  className={`size-4 shrink-0 ${
                    value === option.value ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span>{option.label}</span>
              </Button>
            ))}
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
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
