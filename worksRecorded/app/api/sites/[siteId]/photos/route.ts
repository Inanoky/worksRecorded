import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { createPerfTrace } from "@/lib/observability/perf";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";

const PHOTOS_PER_PAGE = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const trace = createPerfTrace({
    route: "/api/sites/[siteId]/photos",
    requestId: request.headers.get("x-vercel-id") ?? undefined,
    siteId,
  });
  let userId: string | null = null;
  let page = 1;
  let returnedCount = 0;
  let totalCount = 0;

  try {
    const { getUser } = getKindeServerSession();
    const user = await trace.measure("auth", () => getUser());

    if (!user) {
      trace.end({
        status: 401,
        extra: { userId, page, pageSize: PHOTOS_PER_PAGE, returnedCount, totalCount },
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const site = await trace.measure("orgCheck", () => orgCheck(user.id, siteId));

    if (!site) {
      trace.end({
        status: 404,
        extra: { userId, page, pageSize: PHOTOS_PER_PAGE, returnedCount, totalCount },
      });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const skip = (page - 1) * PHOTOS_PER_PAGE;
    const where = {
      siteId,
      AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }],
    };

    const [photos, countedPhotos] = await Promise.all([
      trace.measure("photosQuery", () =>
        prisma.photos.findMany({
          where,
          orderBy: { Date: "desc" },
          skip,
          take: PHOTOS_PER_PAGE,
          select: {
            id: true,
            fileUrl: true,
            Date: true,
            Comment: true,
            Location: true,
          },
        }),
      ),
      trace.measure("countQuery", () => prisma.photos.count({ where })),
    ]);
    returnedCount = photos.length;
    totalCount = countedPhotos;

    trace.end({
      status: 200,
      extra: { userId, page, pageSize: PHOTOS_PER_PAGE, returnedCount, totalCount },
    });
    return NextResponse.json({ photos, totalCount });
  } catch (error) {
    trace.fail(error, {
      status: 500,
      extra: { userId, page, pageSize: PHOTOS_PER_PAGE, returnedCount, totalCount },
    });
    console.error("[api/sites/photos] failed", error);
    return NextResponse.json({ error: "Could not retrieve photos" }, { status: 500 });
  }
}
