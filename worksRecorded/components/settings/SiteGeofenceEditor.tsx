"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LatLngPoint = { lat: number; lng: number };

function safeParsePolygon(value: unknown): LatLngPoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is LatLngPoint => {
    if (!p || typeof p !== "object") return false;
    const obj = p as Record<string, unknown>;
    return typeof obj.lat === "number" && typeof obj.lng === "number";
  });
}

function buildPolygonString(points: LatLngPoint[]) {
  return JSON.stringify(points, null, 2);
}

async function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  console.log("[SiteGeofenceEditor] loading script:", src);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadScriptWithFallback(urls: string[]) {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      await loadScript(url);
      console.log("[SiteGeofenceEditor] script loaded:", url);
      return;
    } catch (err) {
      lastError = err;
      console.warn("[SiteGeofenceEditor] script failed, trying next URL", {
        url,
        err,
      });
    }
  }
  throw lastError ?? new Error("All script URLs failed to load.");
}

function collectCallableAdapterFactories(value: any): Array<{ name: string; fn: any }> {
  const factories: Array<{ name: string; fn: any }> = [];
  const seen = new Set<any>();

  const pushIfFn = (name: string, maybeFn: any) => {
    if (typeof maybeFn === "function" && !seen.has(maybeFn)) {
      seen.add(maybeFn);
      factories.push({ name, fn: maybeFn });
    }
  };

  pushIfFn("root", value);
  pushIfFn("default", value?.default);
  pushIfFn("create", value?.create);
  pushIfFn("TerraDrawGoogleMapsAdapter", value?.TerraDrawGoogleMapsAdapter);
  pushIfFn("GoogleMapsAdapter", value?.GoogleMapsAdapter);

  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      pushIfFn(k, v);
      if (v && typeof v === "object") {
        pushIfFn(`${k}.default`, (v as any).default);
        pushIfFn(`${k}.create`, (v as any).create);
      }
    }
  }

  return factories;
}

export function SiteGeofenceEditor({
  initialPolygon,
  initialMapLink,
}: {
  initialPolygon: unknown;
  initialMapLink?: string | null;
}) {
  const initialPoints = useMemo(() => safeParsePolygon(initialPolygon), [initialPolygon]);
  const [polygonText, setPolygonText] = useState(buildPolygonString(initialPoints));
  const [mapLink, setMapLink] = useState(initialMapLink ?? "");
  const [status, setStatus] = useState<string>("Loading Google Maps + Terra Draw…");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const gmapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log("[SiteGeofenceEditor] init start", {
        hasGoogleMapsApiKey: Boolean(gmapsKey),
      });
      if (!gmapsKey) {
        setStatus("Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map drawing.");
        return;
      }

      try {
        await loadScript(
          `https://maps.googleapis.com/maps/api/js?key=${gmapsKey}&loading=async`
        );
        await loadScriptWithFallback([
          "https://unpkg.com/terra-draw@latest/dist/terra-draw.umd.js",
          "https://cdn.jsdelivr.net/npm/terra-draw@latest/dist/terra-draw.umd.js",
        ]);
        await loadScriptWithFallback([
          "https://unpkg.com/terra-draw-google-maps-adapter@latest/dist/terra-draw-google-maps-adapter.umd.js",
          "https://cdn.jsdelivr.net/npm/terra-draw-google-maps-adapter@latest/dist/terra-draw-google-maps-adapter.umd.js",
        ]);
      } catch (err: any) {
        console.error("[SiteGeofenceEditor] script load failed", err);
        if (!cancelled) setStatus(err?.message || "Failed to load map libraries.");
        return;
      }

      if (cancelled || !mapRef.current) return;

      const w = window as any;
      console.log("[SiteGeofenceEditor] globals snapshot", {
        hasGoogle: Boolean(w.google?.maps),
        terraDrawKeys: Object.keys(w).filter((k) =>
          k.toLowerCase().includes("terra")
        ),
        terraDrawGoogleMapsAdapterKeys: Object.keys(
          w.terraDrawGoogleMapsAdapter ?? {}
        ),
      });
      const center = initialPoints[0] ?? { lat: 56.9496, lng: 24.1052 };

      try {
        const map = new w.google.maps.Map(mapRef.current, {
          center,
          zoom: 18,
          mapTypeId: "roadmap",
        });

        const TerraDrawCtor =
          w.TerraDraw ||
          w.terraDraw?.TerraDraw ||
          w["terra-draw"]?.TerraDraw;
        let TerraDrawGoogleMapsAdapterCtor =
          w.TerraDrawGoogleMapsAdapter ||
          w.terraDrawGoogleMapsAdapter ||
          w.terraDrawGoogleMapsAdapter?.TerraDrawGoogleMapsAdapter ||
          w.terraDrawGoogleMapsAdapter?.GoogleMapsAdapter ||
          w.TerraDrawGoogleMapsAdapterLib?.TerraDrawGoogleMapsAdapter ||
          w["terra-draw-google-maps-adapter"]?.TerraDrawGoogleMapsAdapter;
        const TerraDrawPolygonModeCtor =
          w.TerraDrawPolygonMode ||
          w.terraDraw?.TerraDrawPolygonMode ||
          w["terra-draw"]?.TerraDrawPolygonMode;
        const TerraDrawSelectModeCtor =
          w.TerraDrawSelectMode ||
          w.terraDraw?.TerraDrawSelectMode ||
          w["terra-draw"]?.TerraDrawSelectMode;

        if (!TerraDrawGoogleMapsAdapterCtor) {
          try {
            console.log(
              "[SiteGeofenceEditor] trying ESM adapter import fallback..."
            );
            const mod: any = await import(
              /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/terra-draw-google-maps-adapter@1.3.1/dist/terra-draw-google-maps-adapter.module.js"
            );
            TerraDrawGoogleMapsAdapterCtor =
              mod?.TerraDrawGoogleMapsAdapter ||
              mod?.GoogleMapsAdapter ||
              mod?.default;
            console.log("[SiteGeofenceEditor] adapter import result", {
              moduleKeys: Object.keys(mod ?? {}),
              hasCtor: Boolean(TerraDrawGoogleMapsAdapterCtor),
            });
          } catch (importErr) {
            console.error(
              "[SiteGeofenceEditor] ESM adapter import fallback failed",
              importErr
            );
          }
        }

        console.log("[SiteGeofenceEditor] resolved constructors", {
          TerraDrawCtor: Boolean(TerraDrawCtor),
          TerraDrawGoogleMapsAdapterCtor: Boolean(TerraDrawGoogleMapsAdapterCtor),
          TerraDrawPolygonModeCtor: Boolean(TerraDrawPolygonModeCtor),
          TerraDrawSelectModeCtor: Boolean(TerraDrawSelectModeCtor),
          adapterType: typeof TerraDrawGoogleMapsAdapterCtor,
          adapterKeys:
            TerraDrawGoogleMapsAdapterCtor &&
            typeof TerraDrawGoogleMapsAdapterCtor === "object"
              ? Object.keys(TerraDrawGoogleMapsAdapterCtor)
              : [],
        });

        if (
          !TerraDrawCtor ||
          !TerraDrawGoogleMapsAdapterCtor ||
          !TerraDrawPolygonModeCtor ||
          !TerraDrawSelectModeCtor
        ) {
          console.error("[SiteGeofenceEditor] missing constructors", {
            hasTerraDraw: Boolean(TerraDrawCtor),
            hasAdapter: Boolean(TerraDrawGoogleMapsAdapterCtor),
            hasPolygonMode: Boolean(TerraDrawPolygonModeCtor),
            hasSelectMode: Boolean(TerraDrawSelectModeCtor),
          });
          setStatus("Terra Draw globals were not found. Please refresh and try again.");
          return;
        }

        const adapterArgs = { map, lib: w.google.maps };
        const adapterFactoryCandidates =
          collectCallableAdapterFactories(TerraDrawGoogleMapsAdapterCtor);
        console.log("[SiteGeofenceEditor] adapter factory candidates", {
          count: adapterFactoryCandidates.length,
          names: adapterFactoryCandidates.map((x) => x.name),
        });

        let adapter: any = null;
        let lastAdapterError: unknown = null;

        for (const candidate of adapterFactoryCandidates) {
          try {
            console.log("[SiteGeofenceEditor] trying adapter candidate", candidate.name);
            adapter = new candidate.fn(adapterArgs);
            console.log(
              "[SiteGeofenceEditor] adapter created via new candidate",
              candidate.name
            );
            break;
          } catch (newErr) {
            lastAdapterError = newErr;
            console.warn(
              "[SiteGeofenceEditor] candidate failed with new(), trying as function",
              { name: candidate.name, newErr }
            );
            try {
              adapter = candidate.fn(adapterArgs);
              console.log(
                "[SiteGeofenceEditor] adapter created via function candidate",
                candidate.name
              );
              break;
            } catch (fnErr) {
              lastAdapterError = fnErr;
              console.warn("[SiteGeofenceEditor] candidate failed as function()", {
                name: candidate.name,
                fnErr,
              });
            }
          }
        }

        if (!adapter) {
          console.error("[SiteGeofenceEditor] all adapter candidates failed", {
            lastAdapterError,
            adapterCtorValue: TerraDrawGoogleMapsAdapterCtor,
          });
          throw new Error("Adapter creation failed for all known constructor/function candidates.");
        }
        const draw = new TerraDrawCtor({
          adapter,
          modes: [
            new TerraDrawPolygonModeCtor(),
            new TerraDrawSelectModeCtor(),
          ],
        });

        draw.start();
        draw.setMode("polygon");
        drawRef.current = draw;
        console.log("[SiteGeofenceEditor] draw initialized");

        if (initialPoints.length >= 3) {
          draw.addFeatures([
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [[...initialPoints.map((p) => [p.lng, p.lat]), [initialPoints[0].lng, initialPoints[0].lat]]],
              },
            },
          ]);
        }

        draw.on("change", () => {
          const snapshot = draw.getSnapshot();
          console.log("[SiteGeofenceEditor] draw change snapshot", snapshot);
          const poly = snapshot.find((f: any) => f?.geometry?.type === "Polygon");
          const coords = poly?.geometry?.coordinates?.[0];
          if (!Array.isArray(coords)) return;

          const points = coords
            .slice(0, -1)
            .map((c: [number, number]) => ({ lng: c[0], lat: c[1] }));
          const serialized = buildPolygonString(points);
          setPolygonText(serialized);

          if (points[0]) {
            setMapLink(`https://www.google.com/maps/@${points[0].lat},${points[0].lng},18z`);
          }
        });

        setStatus("Draw polygon directly on the map. Switch to Edit mode to adjust vertices.");
      } catch (err: any) {
        console.error("[SiteGeofenceEditor] Terra Draw init failed", err);
        setStatus(err?.message || "Could not initialize Terra Draw.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [initialPoints]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Draw polygon clicked", {
              hasDrawRef: Boolean(drawRef.current),
            });
            try {
              drawRef.current?.setMode("polygon");
            } catch (err) {
              console.error("[SiteGeofenceEditor] setMode('polygon') failed", err);
            }
          }}
        >
          Draw polygon
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Edit polygon clicked", {
              hasDrawRef: Boolean(drawRef.current),
            });
            try {
              drawRef.current?.setMode("select");
            } catch (err) {
              console.error("[SiteGeofenceEditor] setMode('select') failed", err);
            }
          }}
        >
          Edit polygon
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Clear clicked", {
              hasDrawRef: Boolean(drawRef.current),
            });
            try {
              drawRef.current?.clear();
              setPolygonText("");
            } catch (err) {
              console.error("[SiteGeofenceEditor] clear() failed", err);
            }
          }}
        >
          Clear
        </button>
      </div>

      <div ref={mapRef} className="w-full h-72 rounded-lg border" />
      <p className="text-xs text-muted-foreground">{status}</p>

      <input type="hidden" name="geofencePolygon" value={polygonText} />
      <input type="hidden" name="geofenceMapLink" value={mapLink} />

      <div>
        <label className="block mb-1 text-sm font-medium">Map link</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-base"
          type="url"
          value={mapLink}
          onChange={(e) => setMapLink(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Polygon JSON</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-28"
          value={polygonText}
          onChange={(e) => setPolygonText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          You can still paste JSON manually if needed.
        </p>
      </div>
    </div>
  );
}
