"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/provider/ProjectProvider";

type Props = {
  projectId: string;
  projectName: string;
};

export default function OpenProjectButton({ projectId, projectName }: Props) {
  const { setProject } = useProject();

  const handleClick = () => {
    // You can combine ID and name if needed, or store separately if you extend the context type
    setProject(projectId,projectName);
    localStorage.setItem("projectName", projectName); // Optional: if you want to persist name separately
  };

  return (
    <Button asChild className="w-full  active:scale-95 active:bg-muted transition-transform">
      <Link href={`/dashboard/sites/${projectId}/invoices`} onClick={handleClick}>
        Open Project
      </Link>
    </Button>
  );
}
