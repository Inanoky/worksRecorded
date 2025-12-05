"use client";

import Link from "next/link";
import { navLinks } from "./NavLinks";
import { cn } from "@/lib/utils/utils";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useProject } from "@/components/providers/ProjectProvider";

import {Wrench, Layers, NotebookPen,  Clock8, ReceiptText,  ChartLine} from "lucide-react";

export const projectNavLinks = [
  {
    name: "Dashboard",
    href: "/dashboard/dashboard",
    path: "dashboard",
    icon: ReceiptText,
  },
  // {
  //   name: "Site Diary",
  //   href: "/dashboard/siteDiary",
  //   path: "siteDiary",
  //   icon: NotebookPen,
  // },
  //     {
  //   name: "Project Diary",
  //   href: "/dashboard/projectDiary",
  //   path: "projectDiary",
  //   icon: NotebookPen,
  // },
  //   {
  //   name: "Invoices",
  //   href: "/dashboard/invoices",
  //   path: "invoices",
  //   icon: ReceiptText,
  // },
  //    {
  //   name: "Documents",
  //   href: "/dashboard/documents",
  //   path: "documents",
  //   icon: Layers,
  // },
  
 
  {
    name: "Timesheets",
    href: "/dashboard/timesheets",
    path: "timesheets",
    icon: Clock8,
  },
  // {
  //   name: "Analytics",
  //   href: "/dashboard/programm",
  //   path: "analytics",
  //   icon: ChartLine,
  // },

    {
    name: "Settings",
    href: "/dashboard/settings",
    path: "settings",
    icon: Wrench,
  },
];

export function DashboardItems({ userEmail }: { userEmail?: string }) {
  const { projectId, projectName, setProject } = useProject();
  const pathname = usePathname();

  console.log(userEmail)

  useEffect(() => {
    const isAboveProject =
      pathname === "/dashboard" || pathname === "/dashboard/sites";
    if (isAboveProject && (projectId || projectName)) setProject("", "");
  }, [pathname]);

return (
    <div className="flex items-center w-full justify-between">
      {/* LEFT: Main navigation links + project nav links if selected */}
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {navLinks.map((item) => (
          <Link
            href={item.href}
            key={item.name}
            className={cn(
              pathname === item.href
                ? "bg-muted text-primary"
                : "text-muted-foreground bg-none",
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary/70 text-sm lg:text-base"
            )}
          >
            <item.icon className="size-4" />
            <span className="hidden md:inline-block">{item.name}</span>
          </Link>
        ))}

        {/* Only show project nav links when in a project subroute */}
        {projectName && projectId && /^\/dashboard\/sites\/[^\/]+/.test(pathname) &&
          projectNavLinks.map((item) => (
            <Link
              href={`/dashboard/sites/${projectId}/${item.path}`}
              key={item.name}
              className={cn(
                "text-blue-500 text-sm lg:text-base",
                pathname === `/dashboard/sites/${projectId}/${item.path}`
                  ? "bg-muted"
                  : "bg-none",
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-blue-700"
              )}
                 {...(item.path === "siteDiary"
        ? { "data-tour": "nav-site-diary" } // 👈 always present for Site Diary (this is is Jouyride thingy from 111 : 113)
        : {})}
            >
              <item.icon className="size-4" />
              <span className="hidden md:inline-block">{item.name}</span>
            </Link>
          ))
        }
      </div>
        <div>
         
        </div>
      {/* RIGHT: Project name - now with better mobile handling */}
      {projectName && (
       
     
        <div className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-2 text-blue-600 font-semibold bg-none max-w-[150px] lg:max-w-[200px]">
             
          <span className="truncate">{projectName}</span>
        
        </div>
       

        
      )}
    </div>
  );
}