import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { siteDiaryPhotoPurposeWhere } from "@/lib/photos/media-purpose";
import { estimatePhotoExportSize } from "@/lib/photos/photo-export-size";
import { createPhotoZipStream } from "@/lib/photos/photo-export-zip";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function getArchiveFileName(siteName: string) {
	const safeName = siteName
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
	return `${safeName || "project"}-photos.zip`;
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const { siteId } = await params;
	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const site = await orgCheck(user.id, siteId);
	if (!site || !site.organizationId) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId,
		siteId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const photos = await prisma.photos.findMany({
		where: {
			siteId,
			AND: [
				{ fileUrl: { not: null } },
				{ fileUrl: { not: "" } },
				siteDiaryPhotoPurposeWhere(),
			],
		},
		select: {
			id: true,
			Date: true,
			createdAt: true,
			fileUrl: true,
		},
	});
	const exportablePhotos = photos.filter(
		(photo): photo is typeof photo & { fileUrl: string } =>
			Boolean(photo.fileUrl),
	);

	if (exportablePhotos.length === 0) {
		return NextResponse.json({ error: "No photos to export" }, { status: 404 });
	}

	if (new URL(request.url).searchParams.get("info") === "1") {
		const estimate = await estimatePhotoExportSize(
			exportablePhotos.map((photo) => photo.fileUrl),
		);
		return NextResponse.json(
			{ ...estimate, photoCount: exportablePhotos.length },
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	}

	const fileName = getArchiveFileName(site.name);
	return new Response(createPhotoZipStream(exportablePhotos), {
		headers: {
			"Cache-Control": "private, no-store",
			"Content-Disposition": `attachment; filename="${fileName}"`,
			"Content-Type": "application/zip",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
