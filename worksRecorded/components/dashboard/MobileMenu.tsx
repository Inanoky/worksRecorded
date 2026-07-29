"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProject } from "@/components/providers/ProjectProvider";
import { getNavLinks, getProjectNavLinks } from "./NavLinks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProjectNavigationRuntimeForSite } from "@/lib/production-flow/runtime-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";

type FlowNavigationConfig = {
  labels: {
    navigationTitle: string;
    navigationTitleLv: string;
  };
  navigation: {
    hiddenProjectNavPaths: string[];
  };
};

export function MobileMenu({
  organizationLanguage,
  canAccessAiContext = false,
  canAccessAiEvals = false,
  canAccessFlowConfigAdmin = false,
}: {
  organizationLanguage?: string | null;
  canAccessAiContext?: boolean;
  canAccessAiEvals?: boolean;
  canAccessFlowConfigAdmin?: boolean;
}) {
  const { projectId, projectName } = useProject();
  const [productionNavigationConfig, setProductionNavigationConfig] =
    useState<FlowNavigationConfig | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const pathname = usePathname();
  const navLinks = useMemo(
    () => getNavLinks(organizationLanguage, { canAccessAiEvals, canAccessFlowConfigAdmin }),
    [canAccessAiEvals, canAccessFlowConfigAdmin, organizationLanguage],
  );
  const projectNavLinks = useMemo(
    () => getProjectNavLinks(organizationLanguage, { canAccessAiContext, showAnalytics }),
    [canAccessAiContext, organizationLanguage, showAnalytics],
  );
  const isProjectRoute = /^\/dashboard\/sites\/[^\/]+/.test(pathname);

  useEffect(() => {
    let cancelled = false;
    if (!projectId || !isProjectRoute) {
      setProductionNavigationConfig(null);
      setShowAnalytics(false);
      return;
    }

    getProjectNavigationRuntimeForSite(projectId)
      .then((runtime) => {
        if (!cancelled) {
          setProductionNavigationConfig(runtime?.productionConfig ?? null);
          setShowAnalytics(runtime?.flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductionNavigationConfig(null);
          setShowAnalytics(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isProjectRoute, projectId]);
  const hiddenProjectNavPaths = useMemo(
    () => new Set(productionNavigationConfig?.navigation.hiddenProjectNavPaths ?? []),
    [productionNavigationConfig],
  );
  const visibleProjectNavLinks = useMemo(
    () =>
      hiddenProjectNavPaths.size > 0
        ? projectNavLinks.filter((item) => !hiddenProjectNavPaths.has(item.path))
        : projectNavLinks,
    [hiddenProjectNavPaths, projectNavLinks],
  );
  const productionJournalLabel =
    normalizeLanguageLabel(organizationLanguage) === "lv"
      ? "Būvdarbu žurnāls"
      : "Construction journal";

  const configuredProductionJournalLabel = productionNavigationConfig
    ? normalizeLanguageLabel(organizationLanguage) === "lv"
      ? productionNavigationConfig.labels.navigationTitleLv
      : productionNavigationConfig.labels.navigationTitle
    : productionJournalLabel;

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
        {projectName && projectId && isProjectRoute && (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-blue-600">
              {projectName}
            </div>
            {visibleProjectNavLinks.map((item) => (
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
                  {configuredProductionJournalLabel && item.path === "dashboard"
                    ? configuredProductionJournalLabel
                    : item.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function normalizeLanguageLabel(language?: string | null) {
  return String(language ?? "").toLowerCase().startsWith("lv") ? "lv" : "en";
}
