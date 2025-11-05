// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\server\actions\user-tour-actions.ts
"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

type UserTourMap = Record<string, boolean>;

export async function hasCompletedTour(stepName: string): Promise<boolean> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTour: true },
  });

  const tourMap = (dbUser?.userTour ?? {}) as UserTourMap;
  return !!tourMap[stepName];
}

export async function markTourCompleted(stepName: string): Promise<{ ok: true }> {
  const user = await requireUser();

  // Read current, merge, write back
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTour: true },
  });

  const current = (dbUser?.userTour ?? {}) as UserTourMap;
  const updated: UserTourMap = { ...current, [stepName]: true };

  await prisma.user.update({
    where: { id: user.id },
    data: { userTour: updated },
  });

  return { ok: true };
}
