"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";

type LatLngPoint = { lat: number; lng: number };

type GeoMapProps = {
  initialPolygon?: LatLngPoint[] | null;
  initialMapLink?: string | null;
};

type TerraFeature = {
  id?: string;
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

function isValidPoint(value: unknown): value is LatLngPoint {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.lat === "number" && typeof obj.lng === "number";
}

function sanitizePolygon(points: unknown): LatLngPoint[] {
  if (!Array.isArray(points)) return [];
  return points.filter(isValidPoint);
}

function pointsToFeature(points: LatLngPoint[]): TerraFeature | null {
  if (points.length < 3) return null;

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [...points.map((p) => [p.lng, p.lat]), [points[0].lng, points[0].lat]],
      ],
    },
  };
}

function featureToPoints(feature: TerraFeature | undefined): LatLngPoint[] {
  if (!feature || feature.geometry?.type !== "Polygon") return [];

  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return [];

  const ring = coordinates[0] as unknown[];
  if (ring.length < 4) return [];

  return ring
    .slice(0, -1)
    .map((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const [lng, lat] = coord;
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      return { lat, lng };
    })
    .filter((p): p is LatLngPoint => Boolean(p));
}

function buildMapLink(point?: LatLngPoint, zoom = 18) {
  if (!point) return "";
  return `https://www.google.com/maps/@${point.lat},${point.lng},${zoom}z`;
}

export default function GeoMap({
  initialPolygon,
  initialMapLink,
}: GeoMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const initializedRef = useRef(false);

  const [status, setStatus] = useState("Loading map...");
  const [isReady, setIsReady] = useState(false);
  const [polygon, setPolygon] = useState<LatLngPoint[]>(
    sanitizePolygon(initialPolygon)
  );
  const [mapLink, setMapLink] = useState(initialMapLink ?? "");

  const safeInitialPolygon = useMemo(
    () => sanitizePolygon(initialPolygon),
    [initialPolygon]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        if (!mapRef.current) throw new Error("Map container not found");

        setOptions({
          key: apiKey,
          v: "weekly",
        });

        const { Map } =
          (await importLibrary("maps")) as google.maps.MapsLibrary;

        if (cancelled || !mapRef.current) return;

        const center = safeInitialPolygon[0] ?? { lat: 56.9496, lng: 24.1052 };

        const map = new Map(mapRef.current, {
          center,
          zoom: 18,
          mapTypeId: "roadmap",
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: true,
          clickableIcons: false,
        });

        google.maps.event.addListenerOnce(map, "idle", () => {
          if (cancelled || initializedRef.current) return;
          initializedRef.current = true;

          const draw = new TerraDraw({
            adapter: new TerraDrawGoogleMapsAdapter({
              map,
              lib: google.maps,
              coordinatePrecision: 9,
            }),
            modes: [
              new TerraDrawSelectMode({
                flags: {
                  polygon: {
                    feature: {
                      draggable: true,
                      rotateable: false,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true,
                      },
                    },
                  },
                },
              }),
              new TerraDrawPolygonMode({
                editable: true,
              }),
            ],
          });

          drawRef.current = draw;
          draw.start();

          if (safeInitialPolygon.length >= 3) {
            const initialFeature = pointsToFeature(safeInitialPolygon);
            if (initialFeature) {
              draw.addFeatures([initialFeature as never]);
            }
          }

          draw.on("change", () => {
            const snapshot = (draw.getSnapshot() as TerraFeature[]).filter(
              (f) => f.geometry?.type === "Polygon"
            );

            const latest = snapshot[snapshot.length - 1];
            const points = featureToPoints(latest);

            if (snapshot.length > 1) {
              const idsToRemove = snapshot
                .slice(0, -1)
                .map((f) => f.id)
                .filter((id): id is string => Boolean(id));

              if (idsToRemove.length > 0) {
                draw.removeFeatures(idsToRemove);
              }
            }

            setPolygon(points);
            setMapLink(buildMapLink(points[0]));
          });

          setIsReady(true);
          setStatus("Ready");
          draw.setMode("select");
        });
      } catch (error) {
        console.error("[GeoMap] init failed", error);
        setStatus(
          error instanceof Error ? error.message : "Failed to initialize map"
        );
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        drawRef.current?.stop();
      } catch {}
      drawRef.current = null;
    };
  }, [safeInitialPolygon]);

  const handleDraw = () => {
    const draw = drawRef.current;
    if (!draw) return;

    const snapshot = draw.getSnapshot() as TerraFeature[];
    const ids = snapshot
      .map((f) => f.id)
      .filter((id): id is string => Boolean(id));

    if (ids.length > 0) {
      draw.removeFeatures(ids);
    }

    setPolygon([]);
    setMapLink("");
    draw.setMode("polygon");
  };

  const handleEdit = () => {
    drawRef.current?.setMode("select");
  };

  const handleClear = () => {
    const draw = drawRef.current;
    if (!draw) return;

    draw.clear();
    draw.setMode("select");
    setPolygon([]);
    setMapLink("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDraw}
          disabled={!isReady}
          className="px-3 py-2 rounded border text-sm disabled:opacity-50"
        >
          Draw area
        </button>

        <button
          type="button"
          onClick={handleEdit}
          disabled={!isReady}
          className="px-3 py-2 rounded border text-sm disabled:opacity-50"
        >
          Edit area
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!isReady}
          className="px-3 py-2 rounded border text-sm disabled:opacity-50"
        >
          Clear area
        </button>
      </div>

      <div ref={mapRef} className="w-full h-[40rem] rounded-lg border" />

      <input
        type="hidden"
        name="geofencePolygon"
        value={polygon.length > 0 ? JSON.stringify(polygon) : ""}
        readOnly
      />
      <input
        type="hidden"
        name="geofenceMapLink"
        value={mapLink}
        readOnly
      />

      <div>
        <label className="block mb-1 text-sm font-medium">Map link</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={mapLink}
          readOnly
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Polygon JSON</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-32"
          value={polygon.length > 0 ? JSON.stringify(polygon, null, 2) : ""}
          readOnly
        />
      </div>

      <p className="text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
