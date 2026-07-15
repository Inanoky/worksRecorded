"use client";

import { MouseEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/providers/ProjectProvider";
import { Loader2 } from "lucide-react";

type Props = {
  projectId: string;
  projectName: string;
  label?: string;
  loadingLabel?: string;
};

export default function OpenProjectButton({
  projectId,
  projectName,
  label = "Open Project",
  loadingLabel = "Opening project...",
}: Props) {
  const { setProject } = useProject();
  const [opening, setOpening] = useState(false);
  const basePath = `/dashboard/sites/${projectId}`;
  const href = `${basePath}/dashboard`;

  useEffect(() => {
    if (!opening) return;
    const timeout = window.setTimeout(() => setOpening(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [opening]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (opening) {
      event.preventDefault();
      return;
    }
    setOpening(true);
    setProject(projectId, projectName);
    try {
      window.localStorage.setItem("projectName", projectName);
    } catch {}
  };

  return (
    <Button
      asChild
      className="w-full active:scale-95 active:bg-muted transition-transform"
      aria-disabled={opening}
    >
      <a href={href} onClick={handleClick}>
        {opening ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {loadingLabel}
          </span>
        ) : (
          label
        )}
      </a>
    </Button>
  );
}
