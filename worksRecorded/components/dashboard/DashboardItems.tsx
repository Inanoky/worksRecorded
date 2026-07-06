"use client";

import Link from "next/link";
import { getNavLinks, getProjectNavLinks } from "./NavLinks";
import { cn } from "@/lib/utils/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useProject } from "@/components/providers/ProjectProvider";
import { getProductionFlowNavigationConfig } from "@/lib/production-flow/config";

export function DashboardItems({
  userEmail,
  organizationLanguage,
  canAccessAiContext = false,
  canAccessAiEvals = false,
  canAccessFlowConfigAdmin = false,
}: {
  userEmail?: string | null;
  organizationLanguage?: string | null;
  canAccessAiContext?: boolean;
  canAccessAiEvals?: boolean;
  canAccessFlowConfigAdmin?: boolean;
}) {
  const { projectId, projectName, setProject } = useProject();
  const pathname = usePathname();
  const router = useRouter();
  const navLinks = useMemo(
    () => getNavLinks(organizationLanguage, { canAccessAiEvals, canAccessFlowConfigAdmin }),
    [canAccessAiEvals, canAccessFlowConfigAdmin, organizationLanguage],
  );
  const projectNavLinks = useMemo(
    () => getProjectNavLinks(organizationLanguage, { canAccessAiContext }),
    [canAccessAiContext, organizationLanguage],
  );
  const productionNavigationConfig = useMemo(
    () => getProductionFlowNavigationConfig({ siteId: projectId }),
    [projectId],
  );
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
      ? "Ražošanas žurnāls"
      : "Production journal";

  const configuredProductionJournalLabel = productionNavigationConfig
    ? normalizeLanguageLabel(organizationLanguage) === "lv"
      ? productionNavigationConfig.labels.navigationTitleLv
      : productionNavigationConfig.labels.navigationTitle
    : productionJournalLabel;

  useEffect(() => {
    const isAboveProject =
      pathname === "/dashboard" || pathname === "/dashboard/sites";
    if (isAboveProject && (projectId || projectName)) setProject("", "");
  }, [pathname]);

  useEffect(() => {
    navLinks.forEach((item) => {
      router.prefetch(item.href);
    });
    if (!projectId) return;
    visibleProjectNavLinks.forEach((item) => {
      router.prefetch(`/dashboard/sites/${projectId}/${item.path}`);
    });
  }, [navLinks, projectId, router, visibleProjectNavLinks]);

return (
    <div className="flex items-center w-full justify-between gap-3">
      {/* LEFT: Main navigation links + project nav links if selected */}
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {navLinks.map((item) => (
          <Link
            href={item.href}
            key={item.name}
            prefetch
            onMouseEnter={() => router.prefetch(item.href)}
            className={cn(
              pathname === item.href
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground bg-transparent border-transparent hover:bg-muted/60 hover:text-foreground",
              "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all text-sm whitespace-nowrap"
            )}
          >
            <item.icon className="size-4" />
            <span className="hidden xl:inline-block">{item.name}</span>
          </Link>
        ))}

        {/* Only show project nav links when in a project subroute */}
        {projectName && projectId && /^\/dashboard\/sites\/[^\/]+/.test(pathname) &&
          visibleProjectNavLinks.map((item) => (
            <Link
              href={`/dashboard/sites/${projectId}/${item.path}`}
              key={item.name}
              onMouseEnter={() => router.prefetch(`/dashboard/sites/${projectId}/${item.path}`)}
              className={cn(
                "text-blue-500 text-sm lg:text-base",
                pathname === `/dashboard/sites/${projectId}/${item.path}`
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-transparent border-transparent text-blue-600 hover:bg-blue-50/70",
                "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all whitespace-nowrap"
              )}
                 {...(item.path === "siteDiary"
        ? { "data-tour": "nav-site-diary" } // 👈 always present for Site Diary (this is is Jouyride thingy from 111 : 113)
        : {})}
            >
              <item.icon className="size-4" />
              <span className="hidden xl:inline-block">
                {configuredProductionJournalLabel && item.path === "dashboard"
                  ? configuredProductionJournalLabel
                  : item.name}
              </span>
            </Link>
          ))
        }
      </div>
      {/* RIGHT: Project name - now with better mobile handling */}
      {projectName && (
        <div className="hidden md:flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 font-semibold max-w-[220px]">
          <span className="truncate">{projectName}</span>
        </div>
      )}
    </div>
);
}

function normalizeLanguageLabel(language?: string | null) {
  return String(language ?? "").toLowerCase().startsWith("lv") ? "lv" : "en";
}
