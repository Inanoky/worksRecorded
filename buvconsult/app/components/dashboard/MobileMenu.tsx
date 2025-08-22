"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProject } from "@/components/provider/ProjectProvider";
import { navLinks } from "./navLinks";
import { projectNavLinks } from "./DashboardItems";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export function MobileMenu() {
  const { projectId, projectName } = useProject();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
        {/* Main navigation links */}
        {navLinks.map((item) => (
          <DropdownMenuItem key={item.name} asChild>
            <Link 
              href={item.href} 
              className={cn(
                "flex items-center gap-2 w-full",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.name}
            </Link>
          </DropdownMenuItem>
        ))}

        {/* Project navigation links (only shown when in a project) */}
        {projectName && projectId && /^\/dashboard\/sites\/[^\/]+/.test(pathname) && (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-blue-600">
              {projectName}
            </div>
            {projectNavLinks.map((item) => (
              <DropdownMenuItem key={item.name} asChild>
                <Link
                  href={`/dashboard/sites/${projectId}/${item.path}`}
                  className={cn(
                    "flex items-center gap-2 w-full",
                    pathname === `/dashboard/sites/${projectId}/${item.path}` 
                      ? "text-blue-600" 
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}