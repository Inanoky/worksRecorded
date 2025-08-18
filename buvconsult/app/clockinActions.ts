"use server";
import {prisma} from "@/app/utils/db";


export async function createTeamMember(formData: {
  name: string;
  surname: string;
  personalId: string;
  siteId?: string;
}) {
  try {
    const worker = await prisma.workers.create({
      data: {
        name: formData.name,
        surname: formData.surname,
        personalId: formData.personalId,
        siteId: formData.siteId || null,
        isClockedIn: false,
      },
    });
    return { success: true, worker };
  } catch (error) {
    return { success: false, error: "Failed to create team member" };
  }
}

export async function deleteTeamMember(id: string) {
  try {
    await prisma.workers.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete team member" };
  }
}

export async function editTeamMember(formData: {
  id: string;
  name?: string;
  surname?: string;
  personalId?: string;
  siteId?: string | null;
}) {
  try {
    const worker = await prisma.workers.update({
      where: { id: formData.id },
      data: {
        name: formData.name,
        surname: formData.surname,
        personalId: formData.personalId,
        siteId: formData.siteId,
      },
    });
    return { success: true, worker };
  } catch (error) {
    return { success: false, error: "Failed to update team member" };
  }
}

export async function getTeamMember(id: string) {
  try {
    const worker = await prisma.workers.findUnique({
      where: { id },
      include: {
        Site: true,
        timelog: true,
      },
    });
    return { success: true, worker };
  } catch (error) {
    return { success: false, error: "Failed to fetch team member" };
  }
}


//This is how we clock in 

export async function clockInWorker(formData: {
  workerId: string;
  date: Date;
  clockIn: Date;
  
}) {
  try {
    // First check if worker is already clocked in
    const worker = await prisma.workers.findUnique({
      where: { id: formData.workerId },
      select: { isClockedIn: true }
    });

    if (worker?.isClockedIn) {
      return { success: false, error: "Worker is already clocked in" };
    }

    // Use transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (prisma) => {
      // Create the time record
      const record = await prisma.timelog.create({
        data: {
          workerId: formData.workerId,
          date: formData.date,
          clockIn: formData.clockIn,
          
        },
      });

      // Update worker status
      await prisma.workers.update({
        where: { id: formData.workerId },
        data: { isClockedIn: true },
      });

      return record;
    });

    return { success: true, record: result };
  } catch (error) {
    console.error("Clock-in error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to clock in worker" 
    };
  }




}


export async function clockOutWorker(formData: {
  workerId: string;
  clockOut: Date;
  location: string;
  works: string;
}) {
  try {
    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Verify worker exists and is currently clocked in
      const worker = await prisma.workers.findUnique({
        where: { id: formData.workerId },
        select: { isClockedIn: true }
      });

      if (!worker) {
        throw new Error("Worker not found");
      }
      if (!worker.isClockedIn) {
        throw new Error("Worker is not clocked in");
      }

      // 2. Find the most recent open record
      const openRecord = await prisma.timelog.findFirst({
        where: {
          workerId: formData.workerId,
          clockOut: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!openRecord) {
        throw new Error("No open time record found");
      }

      // 3. Update the record with clock-out time, location, and works
      const updatedRecord = await prisma.timelog.update({
        where: { id: openRecord.id },
        data: {
          clockOut: formData.clockOut,
          wocation: formData.location,
          works: formData.works,
        },
      });

      // 4. Update worker status
      await prisma.workers.update({
        where: { id: formData.workerId },
        data: { isClockedIn: false },
      });

      return updatedRecord;
    });

    return { success: true, record: result };
  } catch (error) {
    console.error("Clock-out error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clock out worker"
    };
  }
}


export async function updateTimeRecord(formData: {
  id: string;
  workerId?: string;
  date?: Date;
  clockIn?: Date;
  clockOut?: Date;
  location?: string;
  works?: string;
}) {
  try {
    const record = await prisma.timelog.update({
      where: { id: formData.id },
      data: {
        workerId: formData.workerId,
        date: formData.date,
        clockIn: formData.clockIn,
        clockOut: formData.clockOut,
        wocation: formData.location,
        works: formData.works,
      },
    });

    // Update worker's clocked in status if clockOut is provided
    if (formData.clockOut && formData.workerId) {
      await prisma.workers.update({
        where: { id: formData.workerId },
        data: { isClockedIn: false },
      });
    }

    return { success: true, record };
  } catch (error) {
    return { success: false, error: "Failed to update time record" };
  }
}

export async function isWorkerClockedIn(workerId: string) {
  try {
    const worker = await prisma.workers.findUnique({
      where: { id: workerId },
      select: { isClockedIn: true },
    });
    return { success: true, isClockedIn: worker?.isClockedIn || false };
  } catch (error) {
    return { success: false, error: "Failed to check clock status" };
  }
}

export async function getAllWorkers(siteId?: string) {
  try {
    const where = siteId ? { siteId } : undefined;
    const workers = await prisma.workers.findMany({
      where,
      orderBy: { name: "asc" },
      // Optionally, include related Site or timelog data here if needed
    });
    return { success: true, workers };
  } catch (error) {
    return { success: false, error: "Failed to fetch workers" };
  }
}



/**
 * Returns siteId for a given workerId
 * @param workerId string
 * @returns siteId or null
 */
export async function getSiteIdByWorkerId(workerId: string): Promise<string | null> {
  const worker = await prisma.workers.findUnique({
    where: { id: workerId },
    select: { siteId: true }
  });
  return worker?.siteId ?? null;
}