// app/actions/savePhoto.ts
"use server";

import { prisma } from "@/app/utils/db";

type SavePhotoArgs = {
  userId: string | null;          // from your prisma.user
  siteId: string | null;          // user.lastSelectedSiteIdforWhatsapp
  url?: string | null;            // public URL (e.g., UploadThing ufsUrl)
  fileUrl?: string | null;        // if you also want to store separately
  comment?: string | null;        // WhatsApp caption / annotation
  location?: string | null;       // optional manual location string
  date?: Date | null;             // defaults to now if not provided
};

type GetPhotosByDateArgs = {
  siteId: string | null;
  startISO: string; // inclusive
  endISO: string;   // exclusive
};

export async function savePhoto({
  userId,
  siteId,
  url,
  fileUrl,
  comment,
  location,
  date,
}: SavePhotoArgs) {
  // Normalize empties to null to satisfy Prisma's optional fields
  const rec = await prisma.photos.create({
    data: {
      Date: date ?? new Date(),
      URL: url ?? null,
      fileUrl: fileUrl ?? url ?? null,
      Comment: comment ?? null,
      Location: location ?? null,
      userId: userId ?? null,
      siteId: siteId ?? null,
    },
  });

  return rec;
}

export async function getPhotosByDate({ siteId, startISO, endISO }: GetPhotosByDateArgs) {
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
