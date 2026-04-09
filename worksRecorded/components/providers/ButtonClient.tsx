"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/providers/ProjectProvider";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  projectId: string;
  projectName: string;
  label?: string;
  loadingLabel?: string;
};

const PROJECT_ROUTES = ["dashboard", "timesheets", "BIS", "settings"];

export default function OpenProjectButton({
  projectId,
  projectName,
  label = "Open Project",
  loadingLabel = "Opening project...",
}: Props) {
  const { setProject } = useProject();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const basePath = `/dashboard/sites/${projectId}`;

  const prefetchProjectRoutes = () => {
    PROJECT_ROUTES.forEach((segment) => {
      router.prefetch(`${basePath}/${segment}`);
    });
  };

  const handleClick = () => {
    if (opening) return;
    setOpening(true);
    setProject(projectId, projectName);
    localStorage.setItem("projectName", projectName);
    prefetchProjectRoutes();
    router.push(`${basePath}/dashboard`);
  };

  return (
    <Button
      className="w-full active:scale-95 active:bg-muted transition-transform"
      onClick={handleClick}
      onMouseEnter={prefetchProjectRoutes}
      onFocus={prefetchProjectRoutes}
      disabled={opening}
    >
      {opening ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
