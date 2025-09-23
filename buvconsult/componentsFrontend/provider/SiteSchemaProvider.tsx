// componentsFrontend/provider/SiteSchemaProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Ctx = {
  siteId: string;
  locations: string[];
  works: string[];
  setLocations: (v: string[]) => void;
  setWorks: (v: string[]) => void;
  refresh: () => Promise<void>;
};

const SiteSchemaContext = createContext<Ctx | undefined>(undefined);

export function SiteSchemaProvider({
  siteId,
  schemaLocations = [],
  schemaWorks = [],
  children,
}: {
  siteId: string;
  schemaLocations?: string[];
  schemaWorks?: string[];
  children: React.ReactNode;
}) {
  const [locations, setLocations] = useState(schemaLocations);
  const [works, setWorks] = useState(schemaWorks);

  // optional: a refresher via API route if you want to reload on demand
  const refresh = async () => {
    if (!siteId) return;
    const res = await fetch(`/api/projects/${siteId}/schema`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { locations: string[]; works: string[] };
      setLocations(json.locations ?? []);
      setWorks(json.works ?? []);
    }
  };

  useEffect(() => {
    // if siteId changes, reset to initial arrays (server-provided)
    setLocations(schemaLocations);
    setWorks(schemaWorks);
  }, [siteId, schemaLocations, schemaWorks]);

  return (
    <SiteSchemaContext.Provider
      value={{ siteId, locations, works, setLocations, setWorks, refresh }}
    >
      {children}
    </SiteSchemaContext.Provider>
  );
}

export function useSiteSchema() {
  const ctx = useContext(SiteSchemaContext);
  if (!ctx) throw new Error("useSiteSchema must be used within SiteSchemaProvider");
  return ctx;
}
