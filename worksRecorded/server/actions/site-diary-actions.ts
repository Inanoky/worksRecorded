"use server";

import { prisma } from "@/lib/utils/db";
import { requireBisAccessTokenForSite, getBisBaseUrl } from "@/server/actions/BIS/service";
import { requireUser } from "@/lib/utils/requireUser";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";

import { SavePhotoArgs, GetPhotosByDateArgs, Args } from "@/server/actions/types";
import { getOrganizationIdByUserId } from "./shared-actions";
import { getOrganizationIdByWorkerId, orgCheck } from "./shared-actions";
import { getUserFullNameById, getWorkerFullNameById } from "./whatsapp-actions";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";


//nothing
function logBisJsonRequest(label: string, url: string, body: unknown) {
  console.log(`[BIS request] ${label}`, { url, body });
}

function logBisGetRequest(label: string, url: string) {
  console.log(`[BIS request] ${label}`, { method: "GET", url });
}

function formatOriginalUserComment(originalUserComment?: string, fullName?: string | null) {
  const normalizedComment = originalUserComment?.trim();
  const normalizedFullName = fullName?.trim();

  if (!normalizedComment) return undefined;
  if (!normalizedFullName) return normalizedComment;

  if (normalizedComment.startsWith(`${normalizedFullName} :`)) {
    return normalizedComment;
  }

  return `${normalizedFullName} : ${normalizedComment}`;
}

//-------Loading config------------------------------

export async function getConfig(siteId: string) {
  const clientConfig = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    select: {
      siteDiaryRecordsMap: true,
    },
  });

  return clientConfig?.siteDiaryRecordsMap ?? null;
}

export async function updateSiteDiaryDropdownOptions(args: {
  siteId: string;
  fieldKey: string;
  options: string[];
}) {
  const user = await requireUser();
  await orgCheck(user.id, args.siteId);

  const site = await prisma.site.findUnique({
    where: { id: args.siteId },
    select: { siteDiaryRecordsMap: true },
  });

  if (!site) throw new Error("Site not found");

  const currentMap =
    site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? structuredClone(site.siteDiaryRecordsMap as Record<string, any>)
      : structuredClone(defaultConfig as Record<string, any>);

  const normalizedOptions = Array.from(
    new Set(args.options.map((option) => option.trim()).filter(Boolean)),
  );
  if (normalizedOptions.some((option) => option.length > 50)) {
    throw new Error("Each option must be 50 characters or less");
  }

  const nextDropdownOptions = Object.fromEntries(
    normalizedOptions.map((option) => [option, option]),
  );

  const fallbackFieldConfig = (defaultConfig as Record<string, any>)?.[args.fieldKey] ?? {
    Type: "dropdown",
    DisplayName: args.fieldKey,
  };

  currentMap[args.fieldKey] = {
    ...(currentMap[args.fieldKey] ?? fallbackFieldConfig),
    DropDownOptions: nextDropdownOptions,
  };

  await prisma.site.update({
    where: { id: args.siteId },
    data: { siteDiaryRecordsMap: currentMap },
  });

  return { ok: true, options: normalizedOptions };
}

type WeatherHourRow = {
  hour: number;
  temperatureC: number | null;
  windSpeedMs: number | null;
  precipitationMm: number | null;
};


type BisWeatherSummary = {
  averageTemperatureC: number | null;
  hadPrecipitation: boolean;
  weatherConditionsLv: string;
};



type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm" | "mixed";

function resolveWeatherKindFromCode(code: number | null, hadPrecipitation: boolean): WeatherKind {
  if (code == null || !Number.isFinite(code)) {
    return hadPrecipitation ? "rain" : "mixed";
  }

  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([45, 48].includes(code)) return "fog";
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3].includes(code)) return "cloudy";
  return hadPrecipitation ? "rain" : "mixed";
}

function resolveWindAdjective(avgWindMs: number | null): "viegls" | "mērens" | "stiprs" | null {
  if (avgWindMs == null || !Number.isFinite(avgWindMs)) return null;
  if (avgWindMs >= 10) return "stiprs";
  if (avgWindMs >= 6) return "mērens";
  if (avgWindMs >= 3) return "viegls";
  return null;
}

function resolvePrecipitationAdjective(maxPrecipMm: number): "neliels" | "mērens" | "stiprs" {
  if (maxPrecipMm >= 4) return "stiprs";
  if (maxPrecipMm >= 1) return "mērens";
  return "neliels";
}

function buildLatvianWeatherConditions(args: {
  weatherKind: WeatherKind;
  hadPrecipitation: boolean;
  avgWindMs: number | null;
  maxPrecipMm: number;
}): string {
  const windAdj = resolveWindAdjective(args.avgWindMs);
  const precipAdj = resolvePrecipitationAdjective(args.maxPrecipMm);

  switch (args.weatherKind) {
    case "storm":
      return windAdj ? `Negaiss un ${windAdj} vējš` : "Negaiss ar nokrišņiem";
    case "snow":
      return windAdj ? `Sniegs un ${windAdj} vējš` : "Sniegs un mākoņains";
    case "rain":
      return windAdj
        ? `${precipAdj} lietus, ${windAdj} vējš`
        : `${precipAdj} lietus, mākoņains`;
    case "fog":
      return windAdj ? `Miglains un ${windAdj} vējš` : "Miglains un mākoņains";
    case "clear":
      return windAdj ? `Skaidrs un ${windAdj} vējš` : "Skaidrs un bezvējš";
    case "cloudy":
      if (args.hadPrecipitation) {
        return windAdj ? `${precipAdj} lietus, ${windAdj} vējš` : `${precipAdj} lietus, mākoņains`;
      }
      return windAdj ? `Mākoņains un ${windAdj} vējš` : "Mākoņains un mierīgs";
    default:
      if (args.hadPrecipitation) {
        return windAdj ? `${precipAdj} lietus, ${windAdj} vējš` : `${precipAdj} lietus, mākoņains`;
      }
      return windAdj ? `Mainīgs laiks un ${windAdj} vējš` : "Mainīgs dienas laiks";
  }
}
function getWorkingDayHoursForBis(dayISO: string, hours: WeatherHourRow[]): WeatherHourRow[] {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const currentUtcHour = now.getUTCHours();
  const maxHour = dayISO === todayISO ? Math.min(18, currentUtcHour) : 18;

  if (maxHour < 8) return [];

  return hours.filter((row) => row.hour >= 8 && row.hour <= maxHour);
}

async function getBisWeatherSummaryForSiteDay(siteId: string, dayISO: string): Promise<BisWeatherSummary | null> {
  console.log("[BIS weather] summary: start", { siteId, dayISO });

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { geofencePolygon: true },
  });

  if (!site?.geofencePolygon) {
    console.warn("[BIS weather] summary: geofence missing, skip weather", { siteId });
    return null;
  }

  const center = computePolygonCentroid(site.geofencePolygon);
  if (!center) {
    console.warn("[BIS weather] summary: centroid could not be computed", { siteId });
    return null;
  }

  console.log("[BIS weather] summary: centroid", { siteId, center });

  const todayISO = new Date().toISOString().slice(0, 10);
  const baseUrl = dayISO <= todayISO
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: center.latitude.toString(),
    longitude: center.longitude.toString(),
    start_date: dayISO,
    end_date: dayISO,
    timezone: "UTC",
    hourly: "temperature_2m,wind_speed_10m,precipitation,weather_code",
  });

  const weatherUrl = `${baseUrl}?${params.toString()}`;
  console.log("[BIS weather] summary: fetching provider", { siteId, dayISO, weatherUrl });
  const response = await fetch(weatherUrl, { cache: "no-store" });
  if (!response.ok) {
    console.error("[BIS weather] summary: provider request failed", {
      siteId,
      dayISO,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("Failed to fetch weather from provider.");
  }

  const payload = await response.json();
  const hourly = payload?.hourly ?? {};
  const times: string[] = Array.isArray(hourly.time) ? hourly.time : [];
  const temperatures: Array<number | null> = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
  const windSpeeds: Array<number | null> = Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : [];
  const precipitation: Array<number | null> = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];
  const weatherCodes: Array<number | null> = Array.isArray(hourly.weather_code) ? hourly.weather_code : [];

  const hours: WeatherHourRow[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const timestamp = times[i];
    if (typeof timestamp !== "string") continue;
    const hour = Number(timestamp.slice(11, 13));
    if (!Number.isFinite(hour)) continue;

    hours.push({
      hour,
      temperatureC: temperatures[i] == null ? null : Number(temperatures[i]),
      windSpeedMs: windSpeeds[i] == null ? null : Number(windSpeeds[i]),
      precipitationMm: precipitation[i] == null ? null : Number(precipitation[i]),
    });
  }

  const workingHours = getWorkingDayHoursForBis(dayISO, hours);

  if (!workingHours.length) {
    console.warn("[BIS weather] summary: no working-hour rows", {
      siteId,
      dayISO,
      totalRows: hours.length,
    });
    return {
      averageTemperatureC: null,
      hadPrecipitation: false,
      weatherConditionsLv: "Mainīgs dienas laiks",
    };
  }

  const temps = workingHours
    .map((row) => row.temperatureC)
    .filter((value): value is number => value != null && Number.isFinite(value));

  const averageTemperatureC = temps.length
    ? Number((temps.reduce((sum, value) => sum + value, 0) / temps.length).toFixed(1))
    : null;

  const windValues = workingHours
    .map((row) => row.windSpeedMs)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const avgWindMs = windValues.length
    ? Number((windValues.reduce((sum, value) => sum + value, 0) / windValues.length).toFixed(1))
    : null;

  const precipValues = workingHours
    .map((row) => row.precipitationMm)
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  const maxPrecipMm = precipValues.length ? Math.max(...precipValues) : 0;
  const hadPrecipitation = maxPrecipMm > 0;

  const codeCounts = new Map<number, number>();
  for (const code of weatherCodes) {
    if (code == null || !Number.isFinite(Number(code))) continue;
    const key = Number(code);
    codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
  }
  const dominantWeatherCode = codeCounts.size
    ? [...codeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const weatherKind = resolveWeatherKindFromCode(dominantWeatherCode, hadPrecipitation);
  const weatherConditionsLv = buildLatvianWeatherConditions({
    weatherKind,
    hadPrecipitation,
    avgWindMs,
    maxPrecipMm,
  });

  console.log("[BIS weather] summary: computed", {
    siteId,
    dayISO,
    totalRows: hours.length,
    workingRows: workingHours.length,
    averageTemperatureC,
    hadPrecipitation,
    avgWindMs,
    maxPrecipMm,
    dominantWeatherCode,
    weatherKind,
    weatherConditionsLv,
  });

  return {
    averageTemperatureC,
    hadPrecipitation,
    weatherConditionsLv,
  };
}

const RECENT_WEATHER_STALE_MS = 2 * 60 * 60 * 1000;

function parseDateKey(dayISO: string): string {
  const normalized = String(dayISO ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Invalid day format. Expected YYYY-MM-DD.");
  }
  return normalized;
}

function extractGeoPoints(input: unknown): Array<[number, number]> {
  const points: Array<[number, number]> = [];

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      if (
        node.length >= 2 &&
        typeof node[0] === "number" &&
        typeof node[1] === "number"
      ) {
        points.push([node[0], node[1]]);
        return;
      }
      for (const child of node) {
        visit(child);
      }
      return;
    }
    if (typeof node === "object") {
      const rec = node as Record<string, unknown>;
      const lngCandidate =
        typeof rec.lng === "number"
          ? rec.lng
          : typeof rec.lon === "number"
            ? rec.lon
            : typeof rec.longitude === "number"
              ? rec.longitude
              : null;
      const latCandidate =
        typeof rec.lat === "number"
          ? rec.lat
          : typeof rec.latitude === "number"
            ? rec.latitude
            : null;
      if (lngCandidate !== null && latCandidate !== null) {
        points.push([lngCandidate, latCandidate]);
      }
      visit(rec.coordinates);
      if (Array.isArray(rec.features)) visit(rec.features);
      if (rec.geometry) visit(rec.geometry);
    }
  };

  visit(input);
  return points;
}

function computePolygonCentroid(geoJson: unknown): { latitude: number; longitude: number } | null {
  console.log("[weather] computePolygonCentroid: start", {
    inputType: typeof geoJson,
    isArray: Array.isArray(geoJson),
  });

  const rings: Array<Array<[number, number]>> = [];

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      if (
        node.length >= 3 &&
        Array.isArray(node[0]) &&
        node[0].length >= 2 &&
        typeof node[0][0] === "number" &&
        typeof node[0][1] === "number"
      ) {
        const ring = (node as unknown[])
          .map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] as [number, number] : null))
          .filter((p): p is [number, number] => Boolean(p && Number.isFinite(p[0]) && Number.isFinite(p[1])));
        if (ring.length >= 3) rings.push(ring);
        return;
      }
      if (
        node.length >= 3 &&
        typeof node[0] === "object" &&
        node[0] !== null &&
        (("lat" in (node[0] as Record<string, unknown>) && "lng" in (node[0] as Record<string, unknown>)) ||
          ("latitude" in (node[0] as Record<string, unknown>) && "longitude" in (node[0] as Record<string, unknown>)))
      ) {
        const ring = (node as Array<Record<string, unknown>>)
          .map((p) => {
            const lat =
              typeof p.lat === "number"
                ? p.lat
                : typeof p.latitude === "number"
                  ? p.latitude
                  : null;
            const lng =
              typeof p.lng === "number"
                ? p.lng
                : typeof p.longitude === "number"
                  ? p.longitude
                  : null;
            return lat !== null && lng !== null ? [lng, lat] as [number, number] : null;
          })
          .filter((p): p is [number, number] => Boolean(p));
        if (ring.length >= 3) rings.push(ring);
        return;
      }
      for (const child of node) visit(child);
      return;
    }
    if (typeof node === "object") {
      const rec = node as Record<string, unknown>;
      visit(rec.coordinates);
      visit(rec.geometry);
      visit(rec.features);
    }
  };

  visit(geoJson);
  console.log("[weather] computePolygonCentroid: rings extracted", {
    ringsCount: rings.length,
    firstRingPoints: rings[0]?.length ?? 0,
  });

  if (!rings.length) {
    const points = extractGeoPoints(geoJson);
    console.warn("[weather] computePolygonCentroid: no rings, fallback to points", {
      pointsCount: points.length,
    });
    if (!points.length) {
      console.error("[weather] computePolygonCentroid: failed - no valid points in geofencePolygon");
      return null;
    }
    const lon = points.reduce((s, [x]) => s + x, 0) / points.length;
    const lat = points.reduce((s, [, y]) => s + y, 0) / points.length;
    console.log("[weather] computePolygonCentroid: fallback centroid", {
      latitude: lat,
      longitude: lon,
    });
    return { latitude: Number(lat.toFixed(6)), longitude: Number(lon.toFixed(6)) };
  }

  let areaSum = 0;
  let cxSum = 0;
  let cySum = 0;

  for (const ring of rings) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      const cross = x1 * y2 - x2 * y1;
      a += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    a *= 0.5;
    if (!a) continue;
    areaSum += a;
    cxSum += cx / (6 * a) * Math.abs(a);
    cySum += cy / (6 * a) * Math.abs(a);
  }

  if (!areaSum) {
    console.warn("[weather] computePolygonCentroid: zero area, fallback to flat point average");
    const points = rings.flat();
    const lon = points.reduce((s, [x]) => s + x, 0) / points.length;
    const lat = points.reduce((s, [, y]) => s + y, 0) / points.length;
    console.log("[weather] computePolygonCentroid: zero-area fallback centroid", {
      latitude: lat,
      longitude: lon,
      pointsCount: points.length,
    });
    return { latitude: Number(lat.toFixed(6)), longitude: Number(lon.toFixed(6)) };
  }

  const totalAbsArea = rings.reduce((sum, ring) => {
    let area = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      area += x1 * y2 - x2 * y1;
    }
    return sum + Math.abs(area * 0.5);
  }, 0);

  const longitude = cxSum / totalAbsArea;
  const latitude = cySum / totalAbsArea;

  console.log("[weather] computePolygonCentroid: centroid computed", {
    latitude,
    longitude,
    totalAbsArea,
  });

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

async function getStoredSiteWeatherRows(siteId: string, dayISO: string): Promise<WeatherHourRow[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    hour: number;
    temperatureC: number | null;
    windSpeedMs: number | null;
    precipitationMm: number | null;
  }>>(
    `SELECT "hour", "temperatureC", "windSpeedMs", "precipitationMm"
     FROM "SiteWeatherHourly"
     WHERE "siteId" = $1 AND "weatherDate" = $2::date
     ORDER BY "hour" ASC`,
    siteId,
    dayISO,
  );

  return rows.map((row) => ({
    hour: Number(row.hour),
    temperatureC: row.temperatureC == null ? null : Number(row.temperatureC),
    windSpeedMs: row.windSpeedMs == null ? null : Number(row.windSpeedMs),
    precipitationMm: row.precipitationMm == null ? null : Number(row.precipitationMm),
  }));
}

function toDayISOFromDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isRecentDay(dayISO: string): boolean {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = new Date(`${dayISO}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return false;
  const diffDays = Math.floor((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays <= 1;
}

async function getLatestWeatherUpdateAt(siteId: string, dayISO: string): Promise<Date | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ updatedAt: Date }>>(
    `SELECT MAX("updatedAt") AS "updatedAt"
     FROM "SiteWeatherHourly"
     WHERE "siteId" = $1 AND "weatherDate" = $2::date`,
    siteId,
    dayISO,
  );

  return rows?.[0]?.updatedAt ? new Date(rows[0].updatedAt) : null;
}

async function fetchAndStoreSiteWeather(args: {
  siteId: string;
  dayISO: string;
  latitude: number;
  longitude: number;
  organizationId?: string | null;
}): Promise<WeatherHourRow[]> {
  const { siteId, dayISO, latitude, longitude, organizationId } = args;

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const isPastOrToday = dayISO <= todayISO;
  const isForecast = dayISO > todayISO;
  const baseUrl = isPastOrToday
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: dayISO,
    end_date: dayISO,
    timezone: "UTC",
    hourly: "temperature_2m,wind_speed_10m,precipitation",
  });

  const weatherUrl = `${baseUrl}?${params.toString()}`;
  console.log("[weather] getSiteDayWeather: fetching provider", { siteId, dayISO, weatherUrl });
  const response = await fetch(weatherUrl, { cache: "no-store" });
  if (!response.ok) {
    console.error("[weather] getSiteDayWeather: provider request failed", {
      siteId,
      dayISO,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("Failed to fetch weather from provider.");
  }

  const payload = await response.json();
  const hourly = payload?.hourly ?? {};
  const times: string[] = Array.isArray(hourly.time) ? hourly.time : [];
  const temperatures: Array<number | null> = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
  const windSpeeds: Array<number | null> = Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : [];
  const precipitation: Array<number | null> = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];

  const results: WeatherHourRow[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const timestamp = times[i];
    if (typeof timestamp !== "string") continue;
    const hourPart = timestamp.slice(11, 13);
    const hour = Number(hourPart);
    if (!Number.isFinite(hour)) continue;

    const temperatureC = temperatures[i] == null ? null : Number(temperatures[i]);
    const windSpeedMs = windSpeeds[i] == null ? null : Number(windSpeeds[i]);
    const precipitationMm = precipitation[i] == null ? null : Number(precipitation[i]);

    results.push({ hour, temperatureC, windSpeedMs, precipitationMm });
  }

  for (const row of results) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SiteWeatherHourly"
      ("id", "siteId", "organizationId", "weatherDate", "hour", "observedAt", "latitude", "longitude", "temperatureC", "windSpeedMs", "precipitationMm", "provider", "fetchedAt", "sourceUpdatedAt", "isForecast")
      VALUES ($1, $2, $3, $4::date, $5, $6::timestamp, $7, $8, $9, $10, $11, 'open-meteo', $12::timestamp, $13::timestamp, $14)
      ON CONFLICT ("siteId", "weatherDate", "hour")
      DO UPDATE SET
        "organizationId" = EXCLUDED."organizationId",
        "observedAt" = EXCLUDED."observedAt",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "temperatureC" = EXCLUDED."temperatureC",
        "windSpeedMs" = EXCLUDED."windSpeedMs",
        "precipitationMm" = EXCLUDED."precipitationMm",
        "provider" = EXCLUDED."provider",
        "fetchedAt" = EXCLUDED."fetchedAt",
        "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt",
        "isForecast" = EXCLUDED."isForecast",
        "updatedAt" = CURRENT_TIMESTAMP`,
      crypto.randomUUID(),
      siteId,
      organizationId ?? null,
      dayISO,
      row.hour,
      `${dayISO} ${String(row.hour).padStart(2, "0")}:00:00`,
      latitude,
      longitude,
      row.temperatureC,
      row.windSpeedMs,
      row.precipitationMm,
      now,
      now,
      isForecast,
    );
  }

  return results;
}

async function ensureWeatherForSiteDay(args: {
  siteId: string;
  dayISO: string;
  forceRefresh?: boolean;
}): Promise<{
  dayISO: string;
  location: { latitude: number; longitude: number };
  hours: WeatherHourRow[];
}> {
  const { siteId } = args;
  const dayISO = parseDateKey(args.dayISO);

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      geofencePolygon: true,
      organizationId: true,
    },
  });
  if (!site) throw new Error("Site not found.");
  if (!site.geofencePolygon) throw new Error("Site geofence polygon is missing.");

  const center = computePolygonCentroid(site.geofencePolygon);
  if (!center) {
    throw new Error("Could not determine site coordinates from geofence polygon.");
  }

  let rows = await getStoredSiteWeatherRows(siteId, dayISO);
  const latestUpdateAt = rows.length ? await getLatestWeatherUpdateAt(siteId, dayISO) : null;
  const shouldRefreshRecent =
    rows.length > 0 &&
    isRecentDay(dayISO) &&
    (!latestUpdateAt || Date.now() - latestUpdateAt.getTime() > RECENT_WEATHER_STALE_MS);
  const shouldFetch = args.forceRefresh || rows.length < 24 || shouldRefreshRecent;

  if (shouldFetch) {
    rows = await fetchAndStoreSiteWeather({
      siteId,
      dayISO,
      latitude: center.latitude,
      longitude: center.longitude,
      organizationId: site.organizationId,
    });
  }

  return {
    dayISO,
    location: {
      latitude: center.latitude,
      longitude: center.longitude,
    },
    hours: rows,
  };
}

export async function getSiteWeatherAvailability(siteId: string) {
  if (!siteId) return { hasGeofencePolygon: false };
  await requireUser();
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { geofencePolygon: true },
  });
  return { hasGeofencePolygon: Boolean(site?.geofencePolygon) };
}

export async function getSiteDayWeather(args: { siteId: string; dayISO: string }) {
  await requireUser();
  const dayISO = parseDateKey(args.dayISO);
  console.log("[weather] getSiteDayWeather called", {
    siteId: args.siteId,
    dayISO,
  });
  const site = await prisma.site.findUnique({
    where: { id: args.siteId },
    select: { geofencePolygon: true },
  });

  if (!site) throw new Error("Site not found.");
  if (!site.geofencePolygon) {
    console.warn("[weather] getSiteDayWeather: missing geofencePolygon", {
      siteId: args.siteId,
    });
    throw new Error("Please mark site location in Settings (geofence polygon is missing).");
  }

  console.log("[weather] getSiteDayWeather: geofencePolygon snapshot", {
    siteId: args.siteId,
    geofenceType: typeof site.geofencePolygon,
    geofencePreview: JSON.stringify(site.geofencePolygon).slice(0, 800),
  });
  const center = computePolygonCentroid(site.geofencePolygon);
  if (!center) {
    console.error("[weather] getSiteDayWeather: centroid calculation failed", {
      siteId: args.siteId,
      geofencePolygon: site.geofencePolygon,
    });
    throw new Error("Could not determine center of the geofence polygon.");
  }
  console.log("[weather] getSiteDayWeather: centroid", {
    siteId: args.siteId,
    center,
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const baseUrl = dayISO <= todayISO
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: center.latitude.toString(),
    longitude: center.longitude.toString(),
    start_date: dayISO,
    end_date: dayISO,
    timezone: "UTC",
    hourly: "temperature_2m,wind_speed_10m,precipitation",
  });

  const weatherUrl = `${baseUrl}?${params.toString()}`;
  console.log("[weather] getSiteDayWeather: fetching provider", { siteId: args.siteId, dayISO, weatherUrl });
  const response = await fetch(weatherUrl, { cache: "no-store" });
  if (!response.ok) {
    console.error("[weather] getSiteDayWeather: provider request failed", {
      siteId: args.siteId,
      dayISO,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error("Failed to fetch weather from provider.");
  }

  const payload = await response.json();
  const hourly = payload?.hourly ?? {};
  const times: string[] = Array.isArray(hourly.time) ? hourly.time : [];
  const temperatures: Array<number | null> = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
  const windSpeeds: Array<number | null> = Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m : [];
  const precipitation: Array<number | null> = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];

  const hours: WeatherHourRow[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const timestamp = times[i];
    if (typeof timestamp !== "string") continue;
    const hour = Number(timestamp.slice(11, 13));
    if (!Number.isFinite(hour)) continue;

    hours.push({
      hour,
      temperatureC: temperatures[i] == null ? null : Number(temperatures[i]),
      windSpeedMs: windSpeeds[i] == null ? null : Number(windSpeeds[i]),
      precipitationMm: precipitation[i] == null ? null : Number(precipitation[i]),
    });
  }

  return {
    dayISO,
    location: center,
    hours,
  };
}

export async function syncRecentActiveDaysWeather() {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCHours(23, 59, 59, 999);

  const [records, photos] = await Promise.all([
    prisma.sitediaryrecords.findMany({
      where: {
        siteId: { not: null },
        Date: { gte: start, lte: end },
      },
      select: { siteId: true, Date: true },
    }),
    prisma.photos.findMany({
      where: {
        siteId: { not: null },
        Date: { gte: start, lte: end },
      },
      select: { siteId: true, Date: true },
    }),
  ]);

  const tasks = new Map<string, { siteId: string; dayISO: string }>();
  for (const row of [...records, ...photos]) {
    const siteId = row.siteId ?? undefined;
    const dayISO = toDayISOFromDate(row.Date);
    if (!siteId || !dayISO) continue;
    tasks.set(`${siteId}:${dayISO}`, { siteId, dayISO });
  }

  const outcomes: Array<{ siteId: string; dayISO: string; ok: boolean; error?: string }> = [];
  for (const task of tasks.values()) {
    try {
      await ensureWeatherForSiteDay({
        siteId: task.siteId,
        dayISO: task.dayISO,
        forceRefresh: true,
      });
      outcomes.push({ ...task, ok: true });
    } catch (err: any) {
      outcomes.push({ ...task, ok: false, error: err?.message ?? "weather_sync_failed" });
    }
  }

  return {
    ok: true,
    scanned: tasks.size,
    synced: outcomes.filter((item) => item.ok).length,
    failed: outcomes.filter((item) => !item.ok).length,
    outcomes,
  };
}

// Site diary records actions

export async function saveSiteDiaryRecord({
  rows,
  userId,
  workerId,
  siteId,
  originalUserComment,
}: {
  rows: any[];
  userId?: string;
  workerId?: string;
  siteId?: string;
  originalUserComment?: string;
}) {
  // 🪵 LOG: Initial inputs for context

  // NEW: Determine the entity and fetch the organization ID
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  // 🪵 LOG: Derived entity info

  const fullName = entityId
    ? isWorker
      ? await getWorkerFullNameById(entityId)
      : await getUserFullNameById(entityId)
    : null;

  const formattedOriginalUserComment = formatOriginalUserComment(
    originalUserComment,
    fullName,
  );

  let org = null;
  if (entityId) {
    // Assuming getOrganizationIdByWorkerId and getOrganizationIdByUserId exist
    // NEW: Use the appropriate lookup function based on whether workerId or userId is present
    if (isWorker) {
      org = await getOrganizationIdByWorkerId(entityId);
    } else {
      org = await getOrganizationIdByUserId(entityId);
    }

    // 🪵 LOG: Organization lookup result
    console.log(`Organization ID found: ${org}`);
  } else {
    // 🪵 LOG: No entity
    console.log("Organization ID skipped: No userId or workerId found.");
  }
  console.log("---------------------------------");

  // Make sure requireUser() is not triggering a redirect!
  // Defensive: Only save if at least one row with location or works
  const toInsert = rows
    .filter((r) => r.Location || r.Works)
    .map((row, idx) => {
      const out = {
        // UPDATE: Conditionally set userId or workerId
        userId: userId ?? undefined,
        workerId: workerId ?? undefined,
        siteId: siteId ?? undefined,
        organizationId: org ?? undefined,

        Date: row.Date ? new Date(row.Date) : undefined,
        Date_Custom_1: row.Date_Custom_1 ? new Date(row.Date_Custom_1) : undefined,
        Date_Custom_2: row.Date_Custom_2 ? new Date(row.Date_Custom_2) : undefined,

        Location: row.Location || undefined,
        Location_Custom_1: row.Location_Custom_1 || undefined,
        Location_Custom_2: row.Location_Custom_2 || undefined,

        Works: row.Works || undefined,
        Works_Custom_1: row.Works_Custom_1 || undefined,
        Works_Custom_2: row.Works_Custom_2 || undefined,

        Comments: row.Comments || undefined,
        Comments_Custom_1: row.Comments_Custom_1 || undefined,
        Comments_Custom_2: row.Comments_Custom_2 || undefined,

        originalUserComment: formattedOriginalUserComment,

        Units: row.Units || undefined,
        Amounts: row.Amounts !== "" ? Number(row.Amounts) : undefined,
        WorkersInvolved:
          row.WorkersInvolved !== "" ? Number(row.WorkersInvolved) : undefined,
        TimeInvolved: row.TimeInvolved !== "" ? Number(row.TimeInvolved) : undefined,
        Photos: [],
      };

      // 🪵 LOG: Transformed row object
      console.log(
        `Transformed Row #${idx + 1} (Original Data: ${JSON.stringify({
          location: row.location,
          works: row.works,
        })}):`,
      );
      console.log(out);

      return out;
    });

  if (!toInsert.length) {
    console.log("--- saveSiteDiaryRecord END: No records to insert ---");
    return { ok: false, message: "No records to insert" };
  }

  try {
    await prisma.sitediaryrecords.createMany({ data: toInsert });

    return { ok: true, count: toInsert.length }; //Multitenant
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}

export async function saveSiteDiaryRecordFromWeb({ rows, siteId }) {
  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id);

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows.map((row, idx) => {
    const out = {
      userId: user.id ?? undefined,
      siteId: siteId ?? undefined,
      organizationId: org ?? undefined,

      Date: row.Date ? new Date(row.Date) : undefined,
      Date_Custom_1: row.Date_Custom_1 ? new Date(row.Date_Custom_1) : undefined,
      Date_Custom_2: row.Date_Custom_2 ? new Date(row.Date_Custom_2) : undefined,
      Location: row.Location || undefined,
      Location_Custom_1: row.Location_Custom_1 || undefined,
      Location_Custom_2: row.Location_Custom_2 || undefined,
      Works: row.Works || undefined,
      Works_Custom_1: row.Works_Custom_1 || undefined,
      Works_Custom_2: row.Works_Custom_2 || undefined,
      Comments: row.Comments || undefined,
      Comments_Custom_1: row.Comments_Custom_1 || undefined,
      Comments_Custom_2: row.Comments_Custom_2 || undefined,
      Units: row.Units || undefined,
      Amounts: row.Amounts !== "" ? Number(row.Amounts) : undefined,
      WorkersInvolved:
        row.WorkersInvolved !== "" ? Number(row.WorkersInvolved) : undefined,
      TimeInvolved: row.TimeInvolved !== "" ? Number(row.TimeInvolved) : undefined,
      Photos: [],
    };
    console.log(`Prepared insert row ${idx}:`, out);
    return out;
  });

  if (!toInsert.length) {
    return { ok: false, message: "No records to insert" };
  }

  // Bulk insert
  try {
    await prisma.sitediaryrecords.createMany({ data: toInsert });
  } catch (err: any) {
    return { ok: false, message: err.message };
  }

  // Optionally, revalidate data on page
  // revalidatePath("/site-diary");

  console.log("Insert successful. Inserted:", toInsert.length, "records.");
  return { ok: true, count: toInsert.length };
}

export async function updateSiteDiaryRecord({ id, ...fields }) {
  console.log("=== updateSiteDiaryRecord called ===");
  console.log("Update ID:", id);
  console.log("Update fields:", JSON.stringify(fields, null, 2));
  try {
    const updated = await prisma.sitediaryrecords.update({
      where: { id },
      data: fields,
    });
    console.log("Update result:", updated);
    return { ok: true, record: updated };
  } catch (err: any) {
    console.error("Error updating record:", err);
    return { ok: false, message: err.message };
  }
}

export async function deleteSiteDiaryRecord({ id }: { id: string }) {
  // id is the Prisma row ID (UUID)
  await prisma.sitediaryrecords.delete({
    where: { id },
  });
  return { success: true };
}

export async function getSiteDiaryRecord({ siteId, date }) {
  // Get records for the *same day* (ignoring time)
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      Date: {
        gte: start,
        lte: end,
      },
    },
    // Pick only the fields you use in your row
    select: {
      id: true,
      Date: true,
      Date_Custom_1: true,
      Date_Custom_2: true,
      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,
      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,

      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
      originalUserComment: true,

      // >>> START: NEW FIELDS for 'Created by' logic
      userId: true, // Keep userId for update payload
      workerId: true, // Keep workerId for update payload
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
      // <<< END: NEW FIELDS
    },
  });

  // Helper function to build the full name from parts
  const formatCreatorName = (
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string => {
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ");
  };

  // Map to frontend row structure
  return records.map((rec) => {
    let createdBy = "";

    if (rec.User) {
      // Created by User
      createdBy = formatCreatorName(rec.User.firstName, rec.User.lastName);
    } else if (rec.Worker) {
      // Created by Worker
      createdBy = formatCreatorName(rec.Worker.name, rec.Worker.surname);
    }

    return {
      id: rec.id,
      Date: rec.Date,
      Date_Custom_1: rec.Date_Custom_1,
      Date_Custom_2: rec.Date_Custom_2,

      Location: rec.Location || "",
      Location_Custom_1: rec.Location_Custom_1 || "",
      Location_Custom_2: rec.Location_Custom_2 || "",

      Works: rec.Works || "",
      Works_Custom_1: rec.Works_Custom_1 || "",
      Works_Custom_2: rec.Works_Custom_2 || "",

      Units: rec.Units || "",
      Amounts: rec.Amounts?.toString() || "",
      WorkersInvolved: rec.WorkersInvolved?.toString() || "",
      TimeInvolved: rec.TimeInvolved?.toString() || "",

      Comments: rec.Comments || "",
      Comments_Custom_1: rec.Comments_Custom_1 || "",
      Comments_Custom_2: rec.Comments_Custom_2 || "",
      originalUserComment: rec.originalUserComment || "",

      // >>> NEW FIELD
      createdBy: createdBy || "N/A",
      // <<< NEW FIELD
    };
  });
}

export async function getSitediaryRecordsBySiteIdForExcel(siteId: string) {
  if (!siteId) throw new Error("Missing siteId");

  const records = await prisma.sitediaryrecords.findMany({
    where: { siteId },
    orderBy: [{ Date: "asc" }],
    select: {
      id: true,
      createdAt: true,
      Date: true,
      Date_Custom_1: true,
      Date_Custom_2: true,

      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,

      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,

      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,

      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Photos: true,
      BISId: true,
      bisStatus: true,
      originalUserComment: true,

      // createdBy support
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
    },
  });

  const formatCreatorName = (
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string => {
    const parts: string[] = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ");
  };

  return records.map((rec) => {
    let createdBy = "";

    if (rec.User) {
      createdBy = formatCreatorName(rec.User.firstName, rec.User.lastName);
    } else if (rec.Worker) {
      createdBy = formatCreatorName(rec.Worker.name, rec.Worker.surname);
    }

    return {
      id: rec.id,
      createdAt: rec.createdAt,
      Date: rec.Date,
      Date_Custom_1: rec.Date_Custom_1,
      Date_Custom_2: rec.Date_Custom_2,

      Location: rec.Location || "",
      Location_Custom_1: rec.Location_Custom_1 || "",
      Location_Custom_2: rec.Location_Custom_2 || "",

      Works: rec.Works || "",
      Works_Custom_1: rec.Works_Custom_1 || "",
      Works_Custom_2: rec.Works_Custom_2 || "",

      Comments: rec.Comments || "",
      Comments_Custom_1: rec.Comments_Custom_1 || "",
      Comments_Custom_2: rec.Comments_Custom_2 || "",

      Units: rec.Units || "",
      Amounts: rec.Amounts?.toString() || "",
      WorkersInvolved: rec.WorkersInvolved?.toString() || "",
      TimeInvolved: rec.TimeInvolved?.toString() || "",

      Photos: rec.Photos ?? [],
      BISId: rec.BISId || null,
      bisStatus: rec.bisStatus || null,
      originalUserComment: rec.originalUserComment || "",

      createdBy: createdBy || "N/A",
    };
  });
}

export type BisPerformedWorkMaterialSelection = {
  constructionMaterialId: string;
  quantity: number;
};

export type BisPerformedWorkAttachmentSelection = {
  url: string;
};

async function fetchBisPagedList(
  urlBase: string,
  accessToken: string,
): Promise<any[]> {
  const allRows: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const separator = urlBase.includes("?") ? "&" : "?";
    const pagedUrl = `${urlBase}${separator}page[number]=${page}&page[size]=${pageSize}`;
    logBisGetRequest("fetch paged list", pagedUrl);
    const res = await bisFetch(
      urlBase,
      pagedUrl,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      throw new Error(json?.errors?.[0]?.detail || json?.error || "Failed to fetch BIS paged list");
    }

    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!rows.length) break;

    allRows.push(...rows);

    const hasNextPage = Boolean(json?.links?.next);
    if (!hasNextPage && rows.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allRows;
}

async function fetchBisRelatedResource(
  relatedUrl: string,
  accessToken: string,
  baseUrl: string,
): Promise<any | null> {
  if (!relatedUrl) return null;

  const url = relatedUrl.startsWith("http")
    ? relatedUrl
    : `${baseUrl}${relatedUrl.startsWith("/") ? relatedUrl : `/${relatedUrl}`}`;
  logBisGetRequest("fetch related resource", url);

  const res = await bisFetch(baseUrl, url, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return null;
  }

  return json?.data ?? null;
}

export async function getBisCaseAvailableMaterials(siteId: string) {
  const { accessToken, bisCaseId: bisCase } = await requireBisAccessTokenForSite(siteId);

  const baseUrl = getBisBaseUrl();
  let caseConstructionRoundId: string | null = null;

  try {
    const caseUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}`;
    logBisGetRequest("fetch BIS case", caseUrl);
    const caseResponse = await bisFetch(
      baseUrl,
      caseUrl,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    const caseText = await caseResponse.text();
    let caseJson: any = null;
    try {
      caseJson = caseText ? JSON.parse(caseText) : null;
    } catch {
      caseJson = null;
    }

    if (caseResponse.ok) {
      const rawRoundId =
        caseJson?.data?.attributes?.case_construction_round_id ??
        caseJson?.data?.attributes?.current_case_construction_round_id ??
        null;
      caseConstructionRoundId = rawRoundId == null ? null : String(rawRoundId);
    } else {
      console.warn("[SiteDiary BIS] Could not load case round id for material availability", {
        siteId,
        bisCase,
        status: caseResponse.status,
        detail: caseJson?.errors?.[0]?.detail ?? caseJson?.error ?? null,
      });
    }
  } catch (error) {
    console.warn("[SiteDiary BIS] Failed to resolve case round id for material availability", {
      siteId,
      bisCase,
      error: error instanceof Error ? error.message : error,
    });
  }

  // 12I7-136: available received construction products for adding into performed works.
  // This endpoint already includes all available rows for the current case context.
  const receivedProductsUrl = caseConstructionRoundId
    ? `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_received_construction_products?filter[case_construction_round_id_eq]=${encodeURIComponent(caseConstructionRoundId)}`
    : `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_received_construction_products`;
  const availableReceivedItems = await fetchBisPagedList(
    receivedProductsUrl,
    accessToken,
  );
  const measureRows = await fetchBisPagedList(
    `${baseUrl}/bisp/api/portal/classifiers?filter[typ_eq]=character_measures`,
    accessToken,
  );
  const measurementNameByCode = new Map<string, string>();
  for (const row of measureRows) {
    const code = row?.attributes?.code == null ? "" : String(row.attributes.code);
    const name = row?.attributes?.name == null ? "" : String(row.attributes.name);
    if (code && name) {
      measurementNameByCode.set(code, name);
    }
  }

  const resolvedReceivedItems = await Promise.all(
    availableReceivedItems.map(async (item: any) => {
      const attributes = item?.attributes ?? {};
      const detailRelatedUrl = item?.relationships?.detail?.links?.related ?? null;
      const constructionMaterialRelatedUrl =
        item?.relationships?.construction_material?.links?.related ?? null;
      const detailData =
        attributes?.construction_material_id == null || attributes?.quantity == null
          ? await fetchBisRelatedResource(detailRelatedUrl, accessToken, baseUrl)
          : null;
      const detailAttributes = detailData?.attributes ?? {};

      const directMaterialId =
        attributes?.construction_material_id ??
        detailAttributes?.construction_material_id ??
        null;

      const parsedMaterialIdFromRelation =
        typeof constructionMaterialRelatedUrl === "string"
          ? constructionMaterialRelatedUrl.match(/\/construction_materials\/([^/?#]+)/)?.[1] ?? null
          : null;

      const constructionMaterialId =
        directMaterialId == null ? parsedMaterialIdFromRelation : String(directMaterialId);
      const quantityRaw =
        attributes?.quantity == null ? detailAttributes?.quantity ?? null : attributes.quantity;

      const measurementRaw =
        attributes?.measurement_unit == null
          ? attributes?.measurement == null
            ? detailAttributes?.measurement_unit == null
              ? detailAttributes?.measurement == null
                ? null
                : String(detailAttributes.measurement)
              : String(detailAttributes.measurement_unit)
            : String(attributes.measurement)
          : String(attributes.measurement_unit);
      const measurementUnit =
        measurementRaw == null ? null : (measurementNameByCode.get(measurementRaw) ?? measurementRaw);

      return {
        id: item?.id ?? null,
        constructionMaterialId,
        quantity: quantityRaw == null ? 0 : Number(quantityRaw),
        materialName: attributes?.material_name ?? attributes?.material_kind ?? null,
        measurementUnit,
        caseConstructionRoundId: attributes?.case_construction_round_id ?? null,
      };
    }),
  );

  console.log("[SiteDiary BIS] Available received construction products loaded", {
    siteId,
    bisCase,
    caseConstructionRoundId,
    endpoint: receivedProductsUrl,
    count: availableReceivedItems.length,
    sample: resolvedReceivedItems.slice(0, 3),
  });

  // Build metadata (label/unit) and total delivered quantity by construction_material_id.
  const approvedMaterialMeta = new Map<string, { label: string; measurementUnit: string | null }>();
  const deliveredByMaterial = new Map<string, number>();

  for (const item of resolvedReceivedItems) {
    const constructionMaterialId = String(item?.constructionMaterialId ?? "");
    if (!constructionMaterialId) continue;

    const deliveredQuantity = Number(item?.quantity ?? 0);
    const measurementUnit = item?.measurementUnit == null ? null : String(item.measurementUnit);
    const label = item?.materialName ?? `Material #${constructionMaterialId}`;

    if (!approvedMaterialMeta.has(constructionMaterialId)) {
      approvedMaterialMeta.set(constructionMaterialId, {
        label: String(label),
        measurementUnit,
      });
    }

    deliveredByMaterial.set(
      constructionMaterialId,
      (deliveredByMaterial.get(constructionMaterialId) ?? 0) + deliveredQuantity,
    );
  }

  // 12I7-184: used materials list (quantity already used in logbook records)
  const availableItems = await fetchBisPagedList(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_used_materials`,
    accessToken,
  );
  console.log("[SiteDiary BIS] Available used materials loaded", {
    siteId,
    bisCase,
    count: availableItems.length,
    sample: availableItems.slice(0, 3).map((item: any) => ({
      id: item?.id ?? null,
      construction_material_id: item?.attributes?.construction_material_id ?? null,
      quantity: item?.attributes?.quantity ?? null,
    })),
  });

  const usedByMaterial = new Map<string, number>();
  for (const item of availableItems) {
    const materialId = String(item?.attributes?.construction_material_id ?? "");
    if (!materialId) continue;

    usedByMaterial.set(
      materialId,
      (usedByMaterial.get(materialId) ?? 0) + Number(item?.attributes?.quantity ?? 0),
    );
  }

  // Remaining = approved delivered (12I7-092 detail.quantity) - used (12I7-184 quantity)
  const results = Array.from(deliveredByMaterial.entries())
    .map(([materialId, deliveredQuantity]) => {
      if (!approvedMaterialMeta.has(materialId)) return null;

      const meta = approvedMaterialMeta.get(materialId)!;
      const usedQuantity = usedByMaterial.get(materialId) ?? 0;
      const remaining = Math.max(0, deliveredQuantity - usedQuantity);

      return {
        id: materialId,
        label: meta.label,
        measurementUnit: meta.measurementUnit,
        deliveredQuantity: Number(deliveredQuantity.toFixed(3)),
        usedQuantity: Number(usedQuantity.toFixed(3)),
        availableQuantity: Number(remaining.toFixed(3)),
      };
    })
    .filter((item: any) => item && item.availableQuantity > 0)
    .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));

  console.log("[SiteDiary BIS] Final materials prepared for dialog", {
    siteId,
    bisCase,
    deliveredMaterialCount: deliveredByMaterial.size,
    usedMaterialCount: usedByMaterial.size,
    finalCount: results.length,
    sample: results.slice(0, 5),
  });

  return results;
}

export async function getSiteGalleryAttachments(siteId: string) {
  if (!siteId) return [];

  const photos = await prisma.photos.findMany({
    where: {
      siteId,
      OR: [{ fileUrl: { not: null } }, { URL: { not: null } }],
    },
    orderBy: { Date: "desc" },
    take: 200,
    select: {
      id: true,
      fileUrl: true,
      URL: true,
      Date: true,
      Comment: true,
    },
  });

  return photos
    .map((photo) => ({
      id: photo.id,
      url: photo.fileUrl || photo.URL || "",
      date: photo.Date,
      comment: photo.Comment,
    }))
    .filter((photo) => Boolean(photo.url));
}

export async function getBisAvailableResponsiblePersons(siteId: string) {
  if (!siteId) return [];

  const { accessToken, bisCaseId: bisCase } = await requireBisAccessTokenForSite(siteId);
  const baseUrl = getBisBaseUrl();
  const responsiblePersonsUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_responsible_persons`;
  logBisGetRequest("fetch available responsible persons", responsiblePersonsUrl);
  const res = await bisFetch(
    baseUrl,
    responsiblePersonsUrl,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to fetch available BIS responsible persons",
    );
  }

  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .map((item: any) => ({
      id: String(item?.id ?? ""),
      personId: item?.attributes?.person_id == null ? null : Number(item.attributes.person_id),
      fullName: item?.attributes?.person_full_name == null ? null : String(item.attributes.person_full_name),
      role: item?.attributes?.role == null ? null : String(item.attributes.role),
      responsiblePersonId:
        item?.attributes?.responsible_person_id == null
          ? null
          : Number(item.attributes.responsible_person_id),
      responsiblePersonType:
        item?.attributes?.responsible_person_type == null
          ? null
          : String(item.attributes.responsible_person_type),
    }))
    .filter((item: any) => item.responsiblePersonId != null && item.responsiblePersonType != null);
}

async function resolveBisResponsiblePersonForCase(
  baseUrl: string,
  bisCase: string,
  accessToken: string,
) {
  const responsiblePersonsUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_responsible_persons`;
  logBisGetRequest("resolve responsible persons", responsiblePersonsUrl);
  const res = await bisFetch(
    baseUrl,
    responsiblePersonsUrl,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to load BIS responsible persons",
    );
  }

  const people = Array.isArray(json?.data) ? json.data : [];
  if (!people.length) {
    throw new Error("No available responsible persons found in BIS case");
  }

  const preferredRoles = new Set([
    "responsible_construction_manager",
    "responsible_construction_manager_substitute",
    "construction_manager",
    "contract_construction_manager",
    "construction_performer",
  ]);

  const byRole = people.find((item: any) => preferredRoles.has(String(item?.attributes?.role ?? "")));
  const fallback = people[0];
  const selected = byRole ?? fallback;
  const responsiblePersonId = selected?.attributes?.responsible_person_id;
  const responsiblePersonType = selected?.attributes?.responsible_person_type;

  if (responsiblePersonId == null || responsiblePersonType == null) {
    throw new Error("BIS responsible person entry is missing id or type");
  }

  return {
    responsiblePersonId: Number(responsiblePersonId),
    responsiblePersonType: String(responsiblePersonType),
  };
}

export async function sendSiteDiaryRecordToBis(
  recordId: string,
  options?: {
    materials?: BisPerformedWorkMaterialSelection[];
    attachments?: BisPerformedWorkAttachmentSelection[];
    eventDate?: string;
    worksDescription?: string;
    amount?: number;
    measurement?: string;
    responsiblePersonId?: number;
    responsiblePersonType?: string;
  },
) {
  if (!recordId) throw new Error("Missing site diary record id");

  const recordSite = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true },
  });

  if (!recordSite?.siteId) {
    throw new Error("Site diary record is not assigned to a site");
  }

  const { accessToken, bisCaseId: bisCase } = await requireBisAccessTokenForSite(recordSite.siteId);

  const diaryRecord = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      Date: true,
      Works: true,
      Location: true,
      Comments: true,
      WorkersInvolved: true,
      Amounts: true,
    },
  });

  if (!diaryRecord) {
    throw new Error("Site diary record not found");
  }

  const baseUrl = getBisBaseUrl();
  const selectedResponsiblePersonId = options?.responsiblePersonId;
  const selectedResponsiblePersonType = options?.responsiblePersonType;
  const resolvedResponsiblePerson =
    selectedResponsiblePersonId != null && selectedResponsiblePersonType
      ? {
          responsiblePersonId: Number(selectedResponsiblePersonId),
          responsiblePersonType: String(selectedResponsiblePersonType),
        }
      : await resolveBisResponsiblePersonForCase(baseUrl, bisCase, accessToken);

  const eventDate = options?.eventDate
    ? new Date(options.eventDate).toISOString().slice(0, 10)
    : (diaryRecord.Date ?? new Date()).toISOString().slice(0, 10);
  const eventTimeFrom = new Date().toTimeString().slice(0, 5);
  const amountValue = Number(options?.amount ?? diaryRecord.Amounts ?? 1);
  const descriptionOverride = options?.worksDescription?.trim().slice(0, 200);

  const bisWeather = await getBisWeatherSummaryForSiteDay(recordSite.siteId, eventDate);
  console.log("[BIS submit] weather summary result", {
    recordId,
    siteId: recordSite.siteId,
    eventDate,
    bisWeather,
  });

  const detailAttributes: Record<string, unknown> = {
    employees: Number(diaryRecord.WorkersInvolved ?? 1),
    quantity: Number.isFinite(amountValue) ? amountValue : 1,
    measurement: Number(options?.measurement ?? process.env.BIS_DEFAULT_MEASUREMENT ?? 12),
  };

  if (bisWeather) {
    detailAttributes.weather_conditions = bisWeather.weatherConditionsLv;
    detailAttributes.weather_precipitation = bisWeather.hadPrecipitation;
    if (bisWeather.averageTemperatureC != null) {
      detailAttributes.weather_temperature = bisWeather.averageTemperatureC;
    }
  }

  const attachments: Array<{ type: "shared_attachments"; uuid: string }> = [];

  for (const selectedAttachment of options?.attachments ?? []) {
    const tempUuid = await uploadLogbookAttachmentToBis({
      photoUrl: selectedAttachment.url,
      accessToken,
      baseUrl,
      bisCase,
      attachmentPath: "performed_work_attachments",
    });

    if (tempUuid) {
      attachments.push({ type: "shared_attachments", uuid: tempUuid });
    }
  }

  const logbookUsedConstructionMaterials = (options?.materials ?? [])
    .filter((item) => item.constructionMaterialId)
    .map((item) => ({
      type: "construction_materials_join",
      attributes: {
        construction_material_id: item.constructionMaterialId,
        quantity: String(Number(item.quantity ?? 0)),
      },
    }));

  const commentsDescription = (descriptionOverride || diaryRecord.Comments || "").trim().replace(/^(?:Works|Comments)\s*:\s*/i, "");

  console.log("[BIS submit] prepared detail attributes", {
    recordId,
    detailAttributes,
  });

  const relationships: Record<string, unknown> = {
    detail: {
      data: {
        type: "performed_work",
        attributes: detailAttributes,
      },
    },
    logbook_used_construction_materials: {
      data: logbookUsedConstructionMaterials,
    },
  };

  if (attachments.length > 0) {
    relationships.attachments = {
      data: attachments,
    };
  }

  const payload = {
    data: {
      type: "performed_work",
      attributes: {
        event_date: eventDate,
        event_time_from: eventTimeFrom,
        case_construction_round_id: null,
        responsible_person_id: resolvedResponsiblePerson.responsiblePersonId,
        responsible_person_type: resolvedResponsiblePerson.responsiblePersonType,
        description:
          commentsDescription || "Site diary entry sent from worksRecorded",
      },
      relationships,
    },
  };

  const performedWorksUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/performed_works`;
  logBisJsonRequest("create performed_work", performedWorksUrl, payload);
  const res = await bisFetch(
    baseUrl,
    performedWorksUrl,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.error("[BIS submit] BIS create performed_work failed", {
      recordId,
      status: res.status,
      statusText: res.statusText,
      detailAttributes,
      response: json,
    });
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to send site diary to BIS",
    );
  }

  const bisId = json?.data?.id ? String(json.data.id) : null;

  if (bisId) {
    const bisStatus =
      json?.data?.attributes?.status == null ? "sent" : String(json.data.attributes.status);
    await prisma.sitediaryrecords.update({
      where: { id: recordId },
      data: { BISId: bisId, bisStatus },
    });
  }

  return {
    success: true,
    bisId,
    response: json,
  };
}

export async function getBisCharacterMeasures(siteId: string) {
  if (!siteId) throw new Error("Missing site id");
  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const { accessToken } = await requireBisAccessTokenForSite(siteId);
  const baseUrl = getBisBaseUrl();

  const classifierRows = await fetchBisPagedList(
    `${baseUrl}/bisp/api/portal/classifiers?filter[typ_eq]=character_measures`,
    accessToken,
  );

  const allowedMeasurementNames = new Set([
    "cm",
    "dienas",
    "gab",
    "ha",
    "kg",
    "km",
    "komplekts",
    "kv",
    "kva",
    "kw",
    "l",
    "m",
    "m2",
    "m3",
    "mēneši",
    "mm",
    "mm2",
    "stundas",
    "t",
  ]);

  return classifierRows
    .map((item: any) => ({
      id: item?.attributes?.code == null ? "" : String(item.attributes.code),
      name: item?.attributes?.name == null ? "" : String(item.attributes.name),
    }))
    .filter((item: { id: string; name: string }) => {
      if (!item.id || !item.name) return false;
      const normalizedName = item.name.trim().replace(/[.\s]/g, "").toLowerCase();
      return allowedMeasurementNames.has(normalizedName);
    })
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
}

type BisApproverSelection = {
  memberId: string;
  memberType: string | null;
  level: number | null;
};

export async function getPossibleSiteDiaryBisApprovers(recordId: string) {
  if (!recordId) throw new Error("Missing site diary record id");

  const user = await requireUser();
  const record = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true, BISId: true },
  });

  if (!record?.siteId) {
    throw new Error("Site diary record is not assigned to a site");
  }

  await orgCheck(user.id, record.siteId);

  if (!record.BISId) {
    throw new Error("Send this record to BIS before selecting approvers");
  }

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(record.siteId);
  const baseUrl = getBisBaseUrl();
  const approversUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/performed_works/${record.BISId}/possible_approvers`;
  logBisGetRequest("fetch possible approvers", approversUrl);

  const res = await bisFetch(
    baseUrl,
    approversUrl,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to fetch BIS possible approvers",
    );
  }

  return (Array.isArray(json?.data) ? json.data : []).map((item: any) => ({
    memberId: String(item?.attributes?.member_id ?? item?.id ?? ""),
    memberType: item?.attributes?.member_type ?? null,
    level: item?.attributes?.level == null ? null : Number(item.attributes.level),
    name:
      item?.attributes?.member_name ??
      item?.attributes?.name ??
      item?.attributes?.full_name ??
      item?.attributes?.approver_name ??
      null,
    status: item?.attributes?.status ?? null,
  }));
}

export async function getSiteDiaryBisApprovalStatus(recordId: string) {
  if (!recordId) throw new Error("Missing site diary record id");

  const user = await requireUser();
  const record = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true, BISId: true },
  });

  if (!record?.siteId || !record.BISId) {
    return null;
  }

  await orgCheck(user.id, record.siteId);

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(record.siteId);
  const baseUrl = getBisBaseUrl();
  const approvalStatusUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/performed_works/${record.BISId}`;
  logBisGetRequest("fetch performed_work status", approvalStatusUrl);

  const res = await bisFetch(
    baseUrl,
    approvalStatusUrl,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (res.status === 404) {
      await prisma.sitediaryrecords.update({
        where: { id: recordId },
        data: { BISId: null, bisStatus: null },
      });
      return null;
    }
    throw new Error(json?.errors?.[0]?.detail || json?.error || "Failed to fetch BIS record status");
  }

  const status = json?.data?.attributes?.status ? String(json.data.attributes.status) : null;
  await prisma.sitediaryrecords.update({
    where: { id: recordId },
    data: { bisStatus: status },
  });

  return status;
}

export async function submitSiteDiaryRecordToBisApproval(
  recordId: string,
  approvers: BisApproverSelection[],
) {
  if (!recordId) throw new Error("Missing site diary record id");
  if (!approvers.length) throw new Error("Select at least one approver");

  const user = await requireUser();
  const record = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true, BISId: true },
  });

  if (!record?.siteId) {
    throw new Error("Site diary record is not assigned to a site");
  }

  await orgCheck(user.id, record.siteId);

  if (!record.BISId) {
    throw new Error("Send this record to BIS before approval");
  }

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(record.siteId);
  const baseUrl = getBisBaseUrl();

  const submitToApproveUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/performed_works/${record.BISId}/submit_to_approve`;
  const submitToApprovePayload = {
    data: {
      type: "performed_work",
      relationships: {
        approvers: {
          data: approvers.map((approver) => ({
            type: "approver",
            attributes: {
              member_id: Number(approver.memberId),
              member_type: approver.memberType,
              level: approver.level,
            },
          })),
        },
      },
    },
  };
  logBisJsonRequest("submit performed_work to approve", submitToApproveUrl, submitToApprovePayload);
  const res = await bisFetch(
    baseUrl,
    submitToApproveUrl,
    {
      method: "PATCH",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(submitToApprovePayload),
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to submit site diary record for BIS approval",
    );
  }

  const status = json?.data?.attributes?.status
    ? String(json.data.attributes.status)
    : "submitted_to_approve";
  await prisma.sitediaryrecords.update({
    where: { id: recordId },
    data: { bisStatus: status },
  });

  return {
    status,
  };
}

export async function copySiteDiaryRecordToDate(recordId: string, targetDateISO: string) {
  if (!recordId) throw new Error("Missing site diary record id");
  if (!targetDateISO) throw new Error("Missing target date");

  const user = await requireUser();
  const source = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: {
      userId: true,
      workerId: true,
      siteId: true,
      organizationId: true,
      Date_Custom_1: true,
      Date_Custom_2: true,
      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,
      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,
      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
      originalUserComment: true,
      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Photos: true,
    },
  });

  if (!source?.siteId) {
    throw new Error("Source site diary record not found");
  }

  await orgCheck(user.id, source.siteId);

  const targetDate = new Date(targetDateISO);
  if (Number.isNaN(targetDate.getTime())) {
    throw new Error("Invalid target date");
  }

  const copied = await prisma.sitediaryrecords.create({
    data: {
      userId: source.userId,
      workerId: source.workerId,
      siteId: source.siteId,
      organizationId: source.organizationId,
      Date: targetDate,
      Date_Custom_1: source.Date_Custom_1,
      Date_Custom_2: source.Date_Custom_2,
      Location: source.Location,
      Location_Custom_1: source.Location_Custom_1,
      Location_Custom_2: source.Location_Custom_2,
      Works: source.Works,
      Works_Custom_1: source.Works_Custom_1,
      Works_Custom_2: source.Works_Custom_2,
      Comments: source.Comments,
      Comments_Custom_1: source.Comments_Custom_1,
      Comments_Custom_2: source.Comments_Custom_2,
      originalUserComment: source.originalUserComment,
      Units: source.Units,
      Amounts: source.Amounts,
      WorkersInvolved: source.WorkersInvolved,
      TimeInvolved: source.TimeInvolved,
      Photos: source.Photos,
      BISId: null,
      bisStatus: null,
    },
    select: { id: true },
  });

  return { id: copied.id };
}

export async function syncDeletedSiteDiaryBisRecords(siteId: string) {
  if (!siteId) throw new Error("Missing site id");

  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);
  const baseUrl = getBisBaseUrl();

  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      BISId: { not: null },
    },
    select: { id: true, BISId: true, bisStatus: true },
  });

  const clearedRecordIds: string[] = [];

  for (const record of records) {
    const bisId = String(record.BISId ?? "");
    if (!bisId) continue;
    const performedWorkUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/performed_works/${bisId}`;
    logBisGetRequest("sync performed_work existence", performedWorkUrl);

    const res = await bisFetch(
      baseUrl,
      performedWorkUrl,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (res.ok) {
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      const currentStatus =
        json?.data?.attributes?.status == null ? null : String(json.data.attributes.status);
      if ((record.bisStatus ?? null) !== currentStatus) {
        await prisma.sitediaryrecords.update({
          where: { id: record.id },
          data: { bisStatus: currentStatus },
        });
      }
      continue;
    }

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    const message = String(json?.errors?.[0]?.detail || json?.error || "").toLowerCase();
    const shouldClear = res.status === 404 || message.includes("not found") || message.includes("deleted");

    if (shouldClear) {
      await prisma.sitediaryrecords.update({
        where: { id: record.id },
        data: { BISId: null, bisStatus: null },
      });
      clearedRecordIds.push(record.id);
    }
  }

  return {
    checked: records.length,
    cleared: clearedRecordIds.length,
    clearedRecordIds,
  };
}

export async function getSiteDiaryRecordBisUrl(recordId: string) {
  if (!recordId) throw new Error("Missing site diary record id");

  const user = await requireUser();
  const record = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true, BISId: true },
  });

  if (!record?.siteId || !record.BISId) return null;
  await orgCheck(user.id, record.siteId);

  const baseUrl = getBisBaseUrl();
  return `${baseUrl}/bisp/lv/portal/logbooks/performed_works/${record.BISId}/edit`;
}

async function uploadLogbookAttachmentToBis({
  photoUrl,
  accessToken,
  baseUrl,
  bisCase,
  attachmentPath,
}: {
  photoUrl: string;
  accessToken: string;
  baseUrl: string;
  bisCase: string;
  attachmentPath: string;
}): Promise<string | null> {
  if (!photoUrl) return null;

  const fileResponse = await fetch(photoUrl, { cache: "no-store" });
  if (!fileResponse.ok) {
    console.warn(`Skipping BIS upload. Unable to download attachment: ${photoUrl}`);
    return null;
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: fileResponse.headers.get("content-type") || "image/jpeg",
  });

  const form = new FormData();
  form.append("upload[file]", blob, "attachment.jpg");
  form.append("upload[obj_id]", crypto.randomUUID());

  const uploadUrl = `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/${attachmentPath}`;
  console.log("[BIS request] upload logbook attachment", {
    url: uploadUrl,
    body: {
      formDataKeys: ["upload[file]", "upload[obj_id]"],
      fileName: "attachment.jpg",
      objId: form.get("upload[obj_id]"),
      attachmentPath,
    },
  });
  const uploadResponse = await bisFetch(
    baseUrl,
    uploadUrl,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
      cache: "no-store",
    },
  );

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    console.warn(`Skipping BIS attachment. Upload failed: ${errText}`);
    return null;
  }

  const json = await uploadResponse.json();
  return json?.data?.attributes?.temp_uuid ?? null;
}

export async function getFilledDays({ siteId, year, month }: Args): Promise<number[]> {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  // site diary records in month
  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      Date: { gte: from, lt: to },
    },
    select: { Date: true },
  });

  // photos in month (with a valid URL)
  const photos = await prisma.photos.findMany({
    where: {
      siteId,
      Date: { gte: from, lt: to },
      OR: [{ URL: { not: null } }, { fileUrl: { not: null } }],
    },
    select: { Date: true },
  });

  // Collect unique day numbers
  const daysSet = new Set<number>();

  records.forEach((rec) => {
    if (rec.Date) daysSet.add(new Date(rec.Date).getDate());
  });

  photos.forEach((p) => {
    if (p.Date) daysSet.add(new Date(p.Date).getDate());
  });

  return Array.from(daysSet).sort((a, b) => a - b);
}


export async function getSiteDiarySchema({ siteId }) {
  if (!siteId) return null;
  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { schema: true },
  });
  return settings?.schema ? JSON.parse(settings.schema) : null;
}

export async function deleteSchemaBySiteId(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  if (!siteId) throw new Error("siteId is required");

  await prisma.sitediarysettings.delete({
    where: { siteId },
  });

  return { success: true, siteId };
}

export async function getLocationsWorksFromSiteSchema(
  siteId: string,
  type: "Location" | "Work",
) {
  const schema = await getSiteDiarySchema({ siteId });

  function extractLocationNames(schema) {
    return schema.filter((node) => node.type === "Location").map((node) => node.name);
  }
  function extractWorkNames(schema) {
    const worksSet = new Set();
    function walk(node) {
      if (node.type === "Work") worksSet.add(node.name);
      node.children?.forEach(walk);
    }
    schema.forEach(walk);
    return Array.from(worksSet);
  }

  if (type === "Location") {
    return extractLocationNames(schema);
  } else {
    return extractWorkNames(schema);
  }
}

export async function savePhoto({
  userId,
  workerId,
  siteId,
  url,
  fileUrl,
  comment,
  location,
  date,
}: SavePhotoArgs) {
  console.log("=== savePhoto() CALLED ===");

  console.log("Incoming args:", {
    userId,
    workerId,
    siteId,
    url,
    fileUrl,
    comment,
    location,
    date,
  });

  // Determine entity identity & mode
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  console.log("Entity identification:", {
    entityId,
    isWorkerMode: isWorker ? "WORKER" : "USER",
  });

  // Fetch organization
  let org = null;
  if (entityId) {
    try {
      org = isWorker
        ? await getOrganizationIdByWorkerId(entityId)
        : await getOrganizationIdByUserId(entityId);

      console.log("Resolved organizationId:", org);
    } catch (err) {
      console.error("Error resolving organization ID:", err);
    }
  } else {
    console.warn("No entityId provided → organizationId will be NULL");
  }

  // Prepare data for Prisma
  const data = {
    Date: date ?? new Date(),
    URL: url ?? null,
    fileUrl: fileUrl ?? url ?? null,
    Comment: comment ?? null,
    Location: location ?? null,
    userId: userId ?? null,
    workerId: workerId ?? null,
    siteId: siteId ?? null,
    organizationId: org,
  };

  console.log("Prisma create payload:", data);

  try {
    const rec = await prisma.photos.create({ data });

    console.log("Photo saved successfully:", rec);
    return rec;
  } catch (err) {
    console.error("❌ Error saving photo:", err);
    throw err;
  }
}

export async function getPhotosByDate({
  siteId,
  startISO,
  endISO,
}: GetPhotosByDateArgs) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  return prisma.photos.findMany({
    where: {
      siteId: siteId ?? undefined,
      Date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { Date: "desc" },
    select: {
      id: true,
      Date: true,
      URL: true,
      fileUrl: true,
      Comment: true,
      Location: true,
      siteId: true,
      userId: true,
    },
  });
}

export async function deletePhotoById(id: string) {
  // Optionally: add auth/ownership checks here
  await prisma.photos.delete({
    where: { id },
  });
  return { ok: true };
}

const PHOTOS_PER_PAGE = 30;
/**
 * Fetches a paginated list of photos for a given site ID, optionally filtered by date range.
 * @param siteId The ID of the site (project).
 * @param page The current page number (1-based index).
 * @param startDate Optional starting date for the filter (inclusive).
 * @param endDate Optional ending date for the filter (inclusive).
 * @returns A promise that resolves to an object containing photos and the total count.
 */
export async function getAllPhotos(
  siteId: string,
  page: number,
  startDate?: Date,
  endDate?: Date,
) {
  try {
    const skip = (page - 1) * PHOTOS_PER_PAGE;

    // Build the WHERE clause
    let dateFilter = {};
    if (startDate && endDate) {
      // Ensure both ends of the range are used for filtering
      dateFilter = {
        Date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const whereClause = {
      siteId: siteId,
      ...dateFilter,
    };

    // 1. Fetch the photos for the current page
    const photos = await prisma.photos.findMany({
      where: whereClause,
      orderBy: {
        Date: "desc",
      },
      skip: skip,
      take: PHOTOS_PER_PAGE,
      select: {
        id: true,
        fileUrl: true,
        Date: true,
        Comment: true,
        Location: true,
      },
    });

    // 2. Get the total count of all photos for pagination logic
    const totalCount = await prisma.photos.count({
      where: whereClause,
    });

    const filteredPhotos = photos.filter((photo) => photo.fileUrl !== null);

    return {
      photos: filteredPhotos,
      totalCount: totalCount,
    };
  } catch (error) {
    console.error(`Failed to fetch photos for siteId ${siteId}:`, error);
    throw new Error("Could not retrieve paginated project photos.");
  }
}
