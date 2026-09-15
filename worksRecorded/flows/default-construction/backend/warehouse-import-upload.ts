import { createHmac, timingSafeEqual } from "node:crypto";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import {
	WAREHOUSE_IMPORT_MAX_BYTES,
	WAREHOUSE_IMPORT_TYPES,
} from "../warehouse-import";

const receiptSchema = z.object({
	siteId: z.string().uuid(),
	userId: z.string().min(1),
	organizationId: z.string().uuid(),
	key: z.string().min(1),
	url: z.string().url(),
	name: z.string().min(1).max(1024),
	type: z.enum(WAREHOUSE_IMPORT_TYPES),
	size: z.number().positive().max(WAREHOUSE_IMPORT_MAX_BYTES),
	fileHash: z.string().min(1),
	expiresAt: z.number(),
});

function receiptSignature(payload: string) {
	const secret = process.env.UPLOADTHING_TOKEN;
	if (!secret) throw new Error("Warehouse upload signing is unavailable");
	return createHmac("sha256", secret)
		.update(`warehouse-invoice:${payload}`)
		.digest();
}

export function signWarehouseUpload(
	data: Omit<z.infer<typeof receiptSchema>, "expiresAt">,
) {
	const payload = Buffer.from(
		JSON.stringify(
			receiptSchema.parse({
				...data,
				expiresAt: Date.now() + 24 * 60 * 60 * 1000,
			}),
		),
	).toString("base64url");
	return `${payload}.${receiptSignature(payload).toString("base64url")}`;
}

export function verifyWarehouseUpload(receipt: string) {
	if (typeof receipt !== "string" || receipt.length > 12000)
		throw new Error("Invalid upload receipt");
	const [payload, signature, extra] = receipt.split(".");
	if (!payload || !signature || extra)
		throw new Error("Invalid upload receipt");
	const expected = receiptSignature(payload);
	const actual = Buffer.from(signature, "base64url");
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
		throw new Error("Invalid upload receipt");
	const data = receiptSchema.parse(
		JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
	);
	if (data.expiresAt <= Date.now()) throw new Error("Upload receipt expired");
	return data;
}

export async function requireWarehouseImportAccess(
	userId: string,
	siteId: string,
) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { organizationId: true, status: true },
	});
	if (
		!user?.organizationId ||
		(user.status !== null && user.status !== "active")
	)
		throw new UploadThingError({
			code: "FORBIDDEN",
			message: "Project access denied",
		});
	const site = await prisma.site.findFirst({
		where: { id: siteId, organizationId: user.organizationId },
		select: { id: true, organizationId: true },
	});
	if (!site)
		throw new UploadThingError({
			code: "FORBIDDEN",
			message: "Project access denied",
		});
	const flow = await resolveFlowModuleKeyForRuntime({
		siteId: site.id,
		organizationId: user.organizationId,
	});
	if (flow !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION)
		throw new UploadThingError({
			code: "FORBIDDEN",
			message: "Warehouse import is unavailable for this flow",
		});
	return { userId, siteId: site.id, organizationId: user.organizationId };
}
