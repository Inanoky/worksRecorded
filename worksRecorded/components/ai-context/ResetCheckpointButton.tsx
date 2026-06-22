"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resetAiCheckpointThreadAction } from "@/server/actions/ai-context-actions";

export function ResetCheckpointButton({
  siteId,
  threadId,
  label,
  disabled,
}: {
  siteId: string;
  threadId: string;
  label: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={resetAiCheckpointThreadAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Reset AI memory for "${label}"?\n\nThis only clears LangGraph checkpoint memory for this thread. Business records, photos, timesheets, settings, and project selection are not deleted.`,
        );
        if (!confirmed) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="threadId" value={threadId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        {pending ? "Resetting" : "Reset"}
      </Button>
    </form>
  );
}
