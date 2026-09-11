import { readFile } from "node:fs/promises";
import path from "node:path";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";

import { isTgemInvoiceFixtureModeEnabled } from "@/lib/tgem-invoice-approval/fixture";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAllowedUploadThingUrl(value: string) {
	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase();
		return (
			url.protocol === "https:" &&
			(hostname === "ufs.sh" ||
				hostname.endsWith(".ufs.sh") ||
				hostname === "utfs.io" ||
				hostname.endsWith(".utfs.io") ||
				hostname === "uploadthing.com" ||
				hostname.endsWith(".uploadthing.com"))
		);
	} catch {
		return false;
	}
}

export async function GET(
	_request: Request,
	{
		params,
	}: { params: Promise<{ invoiceCaseId: string; documentId: string }> },
) {
	const { invoiceCaseId, documentId } = await params;
	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const invoiceCase = await prisma.tgemInvoiceCase.findFirst({
		where: { id: invoiceCaseId },
		select: { id: true, siteId: true, organizationId: true },
	});

	if (!invoiceCase) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	if (invoiceCase.siteId) {
		const site = await orgCheck(user.id, invoiceCase.siteId);
		if (!site || site.organizationId !== invoiceCase.organizationId) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
	} else {
		const dbUser = await prisma.user.findFirst({
			where: { id: user.id, organizationId: invoiceCase.organizationId },
			select: { id: true },
		});
		if (!dbUser) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
	}

	const document = await prisma.tgemInvoiceDocument.findFirst({
		where: { id: documentId, invoiceCaseId: invoiceCase.id },
		select: {
			canonicalUrl: true,
			contentType: true,
			originalFilename: true,
			storageProvider: true,
			storageKey: true,
		},
	});

	if (!document) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	if (document.storageProvider === "fixture") {
		if (
			!isTgemInvoiceFixtureModeEnabled() ||
			document.storageKey !== "TGEMinvoice.png"
		) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const fixtureBytes = await readFile(
			path.join(process.cwd(), "public", "TGEM", "TGEMinvoice.png"),
		);

		return new NextResponse(new Uint8Array(fixtureBytes), {
			status: 200,
			headers: {
				"Content-Type": document.contentType,
				"Content-Disposition": `inline; filename="${document.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
				"Cache-Control": "private, no-store",
			},
		});
	}

	if (!isAllowedUploadThingUrl(document.canonicalUrl)) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const upstream = await fetch(document.canonicalUrl, { redirect: "error" });
	if (!upstream.ok || !upstream.body) {
		return NextResponse.json(
			{ error: "Document unavailable" },
			{ status: 502 },
		);
	}

	return new NextResponse(upstream.body, {
		status: 200,
		headers: {
			"Content-Type": document.contentType,
			"Content-Disposition": `inline; filename="${document.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
			"Cache-Control": "private, no-store",
		},
	});
}
