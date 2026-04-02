import { prisma } from "@/lib/utils/db";
import { clockInWorker, isWorkerClockedIn } from "@/server/actions/timesheets-actions";
import {
  isPointInsidePolygon,
  parseGeofencePolygon,
  verifyClockInToken,
} from "@/lib/utils/clock-in-link";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    const payload = verifyClockInToken(token);
    if (!payload) {
      return Response.json({ ok: false, message: "Invalid or expired clock-in link." }, { status: 400 });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ ok: false, message: "Invalid coordinates." }, { status: 400 });
    }

    const worker = await prisma.workers.findUnique({
      where: { id: payload.workerId },
      include: {
        Site: {
          select: { name: true, geofencePolygon: true },
        },
      },
    });

    if (!worker || !worker.siteId || worker.siteId !== payload.siteId || !worker.Site) {
      return Response.json({ ok: false, message: "Worker or site assignment not found." }, { status: 404 });
    }

    const geofence = parseGeofencePolygon(worker.Site.geofencePolygon);
    if (geofence.length < 3) {
      return Response.json({ ok: false, message: "Site geofence is not configured." }, { status: 400 });
    }

    const inside = isPointInsidePolygon({ lat: latitude, lng: longitude }, geofence);
    if (!inside) {
      return Response.json(
        { ok: false, message: "You are outside site area. Please enter site and try again." },
        { status: 400 }
      );
    }

    const clockStatus = await isWorkerClockedIn(worker.id);
    if (clockStatus.success && clockStatus.isClockedIn) {
      return Response.json({ ok: true, message: "You are already clocked in." });
    }

    const now = new Date();
    const result = await clockInWorker({
      workerId: worker.id,
      siteId: worker.siteId,
      date: now,
      clockIn: now,
    });

    if (!result.success) {
      return Response.json({ ok: false, message: `Clock-in failed: ${result.error ?? "Unknown error"}` }, { status: 500 });
    }

    return Response.json({ ok: true, message: `Clock-in successful at ${worker.Site.name}.` });
  } catch (error) {
    console.error("clock-in verify route error", error);
    return Response.json({ ok: false, message: "Unexpected server error." }, { status: 500 });
  }
}
