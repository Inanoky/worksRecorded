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