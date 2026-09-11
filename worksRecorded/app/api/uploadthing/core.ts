import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";

import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";
import { prisma } from "@/lib/utils/db";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
	tgemInvoiceUploader: f({
		image: { maxFileSize: "16MB", maxFileCount: 1 },
		pdf: { maxFileSize: "16MB", maxFileCount: 1 },
	})
		.input(z.object({ siteId: z.string().min(1) }))
		.middleware(async ({ input }) => {
			const { getUser } = getKindeServerSession();
			const user = await getUser();
			if (!user) throw new UploadThingError("Unauthorized");

			const dbUser = await prisma.user.findUnique({
				where: { id: user.id },
				select: { organizationId: true },
			});
			if (!dbUser?.organizationId) {
				throw new UploadThingError("Organization access is required");
			}
			const organizationId = dbUser.organizationId;

			const site = await prisma.site.findFirst({
				where: {
					id: input.siteId,
					organizationId,
				},
				select: { id: true, organizationId: true },
			});
			if (!site) throw new UploadThingError("Project access denied");

			return {
				userId: user.id,
				organizationId,
				siteId: site.id,
			};
		})
		.onUploadComplete(async ({ metadata, file }) => {
			const invoiceCase = await createTgemInvoiceCaseRecord(prisma, {
				organizationId: metadata.organizationId,
				siteId: metadata.siteId,
				submittedByUserId: metadata.userId,
				source: "dashboard",
				sourceMessageId: file.key,
				sourceSender: metadata.userId,
				storageFile: file,
				storageKey: file.key,
				originalFilename: file.name,
				contentType: file.type,
				byteSize: file.size,
				sha256: file.fileHash,
			});
			const document = invoiceCase.documents[0];
			if (!document) {
				throw new UploadThingError("Invoice document was not created");
			}

			return {
				invoiceCaseId: invoiceCase.id,
				documentId: document.id,
			};
		}),
	// Define as many FileRoutes as you like, each with a unique routeSlug
	fileUploader: f({
		pdf: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 25,
		},
	})
		// Set permissions and file types for this FileRoute
		.middleware(async () => {
			// This code runs on your server before upload
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			// If you throw, the user will not be able to upload
			if (!user) throw new UploadThingError("Unauthorized");

			// Whatever is returned here is accessible in onUploadComplete as `metadata`
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// This code RUNS ON YOUR SERVER after upload
			console.log("Upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);

			// !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
			return { uploadedBy: metadata.userId };
		}),
	imageUploader: f({
		image: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 1,
		},
	})
		// Set permissions and file types for this FileRoute
		.middleware(async () => {
			// This code runs on your server before upload
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			// If you throw, the user will not be able to upload
			if (!user) throw new UploadThingError("Unauthorized");

			// Whatever is returned here is accessible in onUploadComplete as `metadata`
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// This code RUNS ON YOUR SERVER after upload
			console.log("Upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);

			// !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
			return { uploadedBy: metadata.userId };
		}),
	materialAttachmentUploader: f({
		image: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 25,
		},
		pdf: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 25,
		},
	})
		// Set permissions and file types for this FileRoute
		.middleware(async () => {
			// This code runs on your server before upload
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			// If you throw, the user will not be able to upload
			if (!user) throw new UploadThingError("Unauthorized");

			// Whatever is returned here is accessible in onUploadComplete as `metadata`
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// This code RUNS ON YOUR SERVER after upload
			console.log(
				"Material attachment upload complete for userId:",
				metadata.userId,
			);

			console.log("file url", file.ufsUrl);

			// !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
			return { uploadedBy: metadata.userId };
		}),
	documentsUploader: f({
		pdf: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 25,
		},
	})
		// Set permissions and file types for this FileRoute
		.middleware(async () => {
			// This code runs on your server before upload
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			// If you throw, the user will not be able to upload
			if (!user) throw new UploadThingError("Unauthorized");

			// Whatever is returned here is accessible in onUploadComplete as `metadata`
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// This code RUNS ON YOUR SERVER after upload
			console.log("Documents upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);

			// !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
			return { uploadedBy: metadata.userId };
		}),
	excelUploader: f({
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "4MB",
			maxFileCount: 1,
		},
	})
		// Set permissions and file types for this FileRoute
		.middleware(async () => {
			// This code runs on your server before upload
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			// If you throw, the user will not be able to upload
			if (!user) throw new UploadThingError("Unauthorized");

			// Whatever is returned here is accessible in onUploadComplete as `metadata`
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// This code RUNS ON YOUR SERVER after upload
			console.log("Upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);

			// !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
			return { uploadedBy: metadata.userId };
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
