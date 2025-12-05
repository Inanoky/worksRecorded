import { prisma } from "@/lib/utils/db";

export async function tryAcquireLock() {
  const result: any = await prisma.$queryRaw`
    SELECT pg_try_advisory_lock(123456789012345678) AS locked;
  `;
  return result[0].locked === true;
}

export async function releaseLock() {
  await prisma.$executeRaw`
    SELECT pg_advisory_unlock(123456789012345678);
  `;
}