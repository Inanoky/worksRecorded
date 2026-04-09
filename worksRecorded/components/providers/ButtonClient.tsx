"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/providers/ProjectProvider";

type Props = {
  projectId: string;
  projectName: string;
  label?: string;
};

export default function OpenProjectButton({ projectId, projectName, label = "Open Project" }: Props) {
  const { setProject } = useProject();

  const handleClick = () => {
    setProject(projectId, projectName);
    localStorage.setItem("projectName", projectName);
  };

  return (
    <Button asChild className="w-full  active:scale-95 active:bg-muted transition-transform">
      <Link href={`/dashboard/sites/${projectId}/dashboard`} onClick={handleClick}>
        {label}
      </Link>
    </Button>
  );
}
