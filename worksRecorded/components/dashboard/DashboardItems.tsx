"use client";

import Link from "next/link";
import { getNavLinks, getProjectNavLinks } from "./NavLinks";
import { cn } from "@/lib/utils/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/providers/ProjectProvider";
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
  const [productionNavigationConfig, setProductionNavigationConfig] =
    useState<FlowNavigationConfig | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
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
  const projectSettingsLink = visibleProjectNavLinks.find(
    (item) => item.path === "settings",
  );
  const scrollableProjectNavLinks = visibleProjectNavLinks.filter(
    (item) => item.path !== "settings",
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
    if (!isProjectRoute) return;
    visibleProjectNavLinks.forEach((item) => {
      router.prefetch(`/dashboard/sites/${projectId}/${item.path}`);
    });
  }, [isProjectRoute, navLinks, projectId, router, visibleProjectNavLinks]);

return (
    <div className="flex items-center w-full justify-between gap-3">
      {/* LEFT: Main navigation links + project nav links if selected */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
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
        {projectName && projectId && isProjectRoute &&
          scrollableProjectNavLinks.map((item) => (
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
      {projectName && projectId && isProjectRoute && projectSettingsLink ? (
        <Link
          href={`/dashboard/sites/${projectId}/${projectSettingsLink.path}`}
          prefetch
          aria-label={projectSettingsLink.name}
          title={projectSettingsLink.name}
          onMouseEnter={() =>
            router.prefetch(
              `/dashboard/sites/${projectId}/${projectSettingsLink.path}`,
            )
          }
          className={cn(
            pathname ===
              `/dashboard/sites/${projectId}/${projectSettingsLink.path}`
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-transparent border-transparent text-blue-600 hover:bg-blue-50/70",
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm text-blue-500 transition-all lg:text-base",
          )}
        >
          <projectSettingsLink.icon className="size-4" />
          <span className="hidden xl:inline-block">
            {projectSettingsLink.name}
          </span>
        </Link>
      ) : null}
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
