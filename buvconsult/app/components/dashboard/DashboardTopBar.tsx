"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProject } from "@/componentsFrontend/provider/ProjectProvider";
import { Button } from "@/componentsFrontend/ui/button";
import { Badge } from "@/componentsFrontend/ui/badge";
import {
  Home, Globe, DollarSign, ChartBar, Settings
} from "lucide-react";

const mainLinks = [
  { name: "Invoices", href: "/dashboard", icon: Home },
  { name: "Timesheets", href: "/dashboard/sites", icon: Globe },
];

const projectLinks = [
  { name: "Program", path: "program", icon: DollarSign },
  { name: "Analytics", path: "analytics", icon: ChartBar },
  { name: "Settings", path: "settings", icon: Settings },
];

export function DashboardTopBar() {
  const pathname = usePathname();
  const { projectId, projectName, setProject } = useProject();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Left: App name */}
        <span className="font-bold text-xl tracking-tight mr-6">Dashboard</span>

        {/* Main links */}
        <nav className="flex items-center gap-1">
          {mainLinks.map((item) => (
            <NavLink key={item.name} href={item.href} active={pathname === item.href} icon={item.icon}>
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Project section */}
        {projectName && (
          <div className="flex items-center gap-3 ml-8">
            <Badge className="font-medium text-sm px-2 py-1 bg-muted text-primary rounded">
              Project: {projectName}
            </Badge>
            <nav className="flex items-center gap-1">
              {projectLinks.map((item) => (
                <NavLink
                  key={item.name}
                  href={`/dashboard/sites/${projectId}/${item.path}`}
                  active={pathname === `/dashboard/sites/${projectId}/${item.path}`}
                  icon={item.icon}
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* (Optional) User/account section here */}
      </div>
    </header>
  );
}

function NavLink({ href, active, icon: Icon, children }) {
  return (
    <Link href={href} passHref legacyBehavior>
      <Button
        asChild
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-base rounded-md",
          active ? "font-semibold" : ""
        )}
      >
        <a>
          <Icon className="size-4" />
          {children}
        </a>
      </Button>
    </Link>
  );
}
