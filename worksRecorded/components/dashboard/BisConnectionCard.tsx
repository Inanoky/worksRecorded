"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BisCaseOption } from "@/lib/bis/format";

export function BisConnectionCard({
  siteId,
  isConnected,
  selectedCaseId,
  selectedCaseLabel,
  cases,
  connectUrl,
  onSaveCase,
}: {
  siteId: string;
  isConnected: boolean;
  selectedCaseId?: string | null;
  selectedCaseLabel?: string | null;
  cases: BisCaseOption[];
  connectUrl: string;
  onSaveCase: (siteId: string, caseId: string) => Promise<{ success: true }>;
}) {
  const [value, setValue] = React.useState(selectedCaseId ?? "");
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">BIS integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect BIS, select the active case for this site, and manage BIS materials.
          </p>
        </div>
        <Button asChild variant={isConnected ? "outline" : "default"}>
          <a href={connectUrl}>{isConnected ? "Reconnect BIS" : "Connect BIS"}</a>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-2 text-sm font-medium">Selected BIS case</div>
          <Select
            value={value}
            onValueChange={(next) => {
              setValue(next);
              startTransition(async () => {
                try {
                  await onSaveCase(siteId, next);
                  toast.success("BIS case saved");
                } catch (error: any) {
                  toast.error(error?.message ?? "Failed to save BIS case");
                }
              });
            }}
            disabled={!isConnected || pending || cases.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={isConnected ? "Select BIS case" : "Connect BIS first"} />
            </SelectTrigger>
            <SelectContent>
              {cases.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedCaseLabel ? `Current: ${selectedCaseLabel}` : "No BIS case selected yet."}
        </div>
      </div>
    </div>
  );
}
