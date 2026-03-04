import { prisma } from "@/lib/utils/db";

export async function getSession(userPhone: string) {
  return prisma.bookingSession.findUnique({
    where: { userPhone },
  });
}

export async function startSession(userPhone: string) {
  return prisma.bookingSession.upsert({
    where: { userPhone },
    update: {
      step: "service",
      service: null,
      date: null,
      time: null,
    },
    create: {
      userPhone,
      step: "service",
    },
  });
}

export async function updateSession(userPhone: string, data: any) {
  return prisma.bookingSession.update({
    where: { userPhone },
    data,
  });
}

export async function deleteSession(userPhone: string) {
  return prisma.bookingSession.delete({
    where: { userPhone },
  });
}