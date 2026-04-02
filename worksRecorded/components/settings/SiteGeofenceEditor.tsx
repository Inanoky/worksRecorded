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

let googleMapsOptionsInitialized = false;

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
      console.log("[SiteGeofenceEditor] init start", { hasGoogleMapsApiKey: Boolean(gmapsKey) });

      if (!gmapsKey) {
        setStatus("Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map drawing.");
        return;
      }

      try {
        const [googleLoaderModule, terraModule, adapterModule] = await Promise.all([
          import("@googlemaps/js-api-loader"),
          import("terra-draw"),
          import("terra-draw-google-maps-adapter"),
        ]);

        const {
          TerraDraw,
          TerraDrawPolygonMode,
          TerraDrawSelectMode,
        } = terraModule as any;

        const TerraDrawGoogleMapsAdapter =
          (adapterModule as any).TerraDrawGoogleMapsAdapter ?? (adapterModule as any).default;

        if (!TerraDraw || !TerraDrawPolygonMode || !TerraDrawSelectMode || !TerraDrawGoogleMapsAdapter) {
          console.error("[SiteGeofenceEditor] required exports missing", {
            terraKeys: Object.keys(terraModule ?? {}),
            adapterKeys: Object.keys(adapterModule ?? {}),
          });
          setStatus("Failed to load Terra Draw exports. Check console.");
          return;
        }

        const { setOptions, importLibrary } = googleLoaderModule as any;
        if (!googleMapsOptionsInitialized) {
          setOptions({ apiKey: gmapsKey, version: "weekly" });
          googleMapsOptionsInitialized = true;
        } else {
          console.log("[SiteGeofenceEditor] setOptions skipped (already initialized)");
        }
        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;

        if (cancelled || !mapRef.current) return;

        const center = initialPoints[0] ?? { lat: 56.9496, lng: 24.1052 };
        const map = new Map(mapRef.current, {
          center,
          zoom: 18,
          mapTypeId: "roadmap",
        });

        const mapDiv = map?.getDiv?.();
        if (!mapDiv) {
          throw new Error("Google Map container is not available after map creation.");
        }

        const googleMapsLib = (window as any)?.google?.maps;
        if (!googleMapsLib) {
          throw new Error("Google Maps library is not available on window.google.maps.");
        }

        const adapter = new TerraDrawGoogleMapsAdapter({
          map,
          lib: googleMapsLib,
        });

        const draw = new TerraDraw({
          adapter,
          modes: [new TerraDrawPolygonMode(), new TerraDrawSelectMode()],
        });

        draw.start();
        draw.setMode("polygon");
        drawRef.current = draw;

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
          const poly = snapshot.find((f: any) => f?.geometry?.type === "Polygon");
          const coords = poly?.geometry?.coordinates?.[0];
          if (!Array.isArray(coords)) return;

          const points = coords.slice(0, -1).map((c: [number, number]) => ({ lng: c[0], lat: c[1] }));
          const serialized = buildPolygonString(points);
          setPolygonText(serialized);

          if (points[0]) {
            setMapLink(`https://www.google.com/maps/@${points[0].lat},${points[0].lng},18z`);
          }
        });

        console.log("[SiteGeofenceEditor] draw initialized");
        setStatus("Draw polygon directly on the map. Switch to Edit mode to adjust vertices.");
      } catch (err: any) {
        console.error("[SiteGeofenceEditor] init failed", err);
        const errText = String(err?.message ?? "");
        if (
          errText.includes("addEventListener") ||
          errText.includes("ApiProjectMapError") ||
          errText.includes("NoApiKeys")
        ) {
          setStatus(
            "Google Maps API key/project is misconfigured (NoApiKeys / ApiProjectMapError). Fix API key, billing and referrer restrictions."
          );
        } else {
          setStatus("Could not initialize Google Maps + Terra Draw. See console logs.");
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
      try {
        drawRef.current?.stop?.();
      } catch (err) {
        console.warn("[SiteGeofenceEditor] draw stop warning", err);
      }
    };
  }, [initialPoints]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Draw polygon clicked", { hasDrawRef: Boolean(drawRef.current) });
            drawRef.current?.setMode("polygon");
          }}
        >
          Draw polygon
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Edit polygon clicked", { hasDrawRef: Boolean(drawRef.current) });
            drawRef.current?.setMode("select");
          }}
        >
          Edit polygon
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          onClick={() => {
            console.log("[SiteGeofenceEditor] Clear clicked", { hasDrawRef: Boolean(drawRef.current) });
            drawRef.current?.clear();
            setPolygonText("");
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
        <p className="text-xs text-muted-foreground mt-1">You can still paste JSON manually if needed.</p>
      </div>
    </div>
  );
}
