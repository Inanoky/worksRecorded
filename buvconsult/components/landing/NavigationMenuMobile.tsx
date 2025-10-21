"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProject } from "@/components/providers/ProjectProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { Menu } from "lucide-react";
import { DATA_LINKS, MAIN_LINKS } from "@/components/landing/NavigationLinks"

export function NavigationMenuMobile() {
 
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-10 w-10" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="">
        {/* Main navigation links */}
        {DATA_LINKS.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <Link 
              href={item.href} 
              className={cn(
                "flex items-center gap-2 w-full",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
       
              {item.id}
            </Link>
          </DropdownMenuItem>
        ))}

        {/* Project navigation links (only shown when in a project) */}
    
      </DropdownMenuContent>
    </DropdownMenu>
  );
}