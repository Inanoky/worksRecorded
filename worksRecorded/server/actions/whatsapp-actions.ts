import {prisma} from "@/lib/utils/db";


export async function getWorkerNameById(workerId: string) {
  try {
    const worker = await prisma.workers.findUnique({
      where: { id: workerId },
      select: { name: true },
    });

    return worker?.name ?? null;
  } catch (error) {
    console.error("Error fetching worker:", error);
    throw new Error("Could not fetch worker name");
  }
}


export async function getUserFirstNameById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    return user?.firstName ?? null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Could not fetch user first name");
  }
}

export async function getWorkerFullNameById(workerId: string) {
  try {
    const worker = await prisma.workers.findUnique({
      where: { id: workerId },
      select: { name: true, surname: true },
    });

    return [worker?.name, worker?.surname].filter(Boolean).join(" ") || null;
  } catch (error) {
    console.error("Error fetching worker full name:", error);
    throw new Error("Could not fetch worker full name");
  }
}

export async function getUserFullNameById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  } catch (error) {
    console.error("Error fetching user full name:", error);
    throw new Error("Could not fetch user full name");
  }
}
