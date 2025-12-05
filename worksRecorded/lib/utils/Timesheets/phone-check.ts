"use server";

import { prisma } from "../db";

export async function checkPhoneUnique(phone: string) {
  const existsInWorkers = await prisma.workers.findFirst({ where: { phone } });
  const existsInUsers = await prisma.user.findFirst({ where: { phone } });

  return { unique: !existsInWorkers && !existsInUsers };
}