import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Fetch all active workplaces (status 0 = ACTIVE)
    const activeWorkplaces = await prisma.workplace.findMany({
      where: { status: 0 },
      select: { id: true, name: true },
    });

    // Retrieve all completed shifts: a shift is completed if it has a worker assigned and not cancelled
    const completedShifts = await prisma.shift.findMany({
      where: {
        workerId: { not: null },
        cancelledAt: null,
      },
      select: { workplaceId: true },
    });

    // Count completed shifts per workplace using a Map
    const shiftCountMap = new Map<number, number>();
    for (const shift of completedShifts) {
      const current = shiftCountMap.get(shift.workplaceId) ?? 0;
      shiftCountMap.set(shift.workplaceId, current + 1);
    }

    // Build an array of active workplaces with their completed shift counts (default to 0)
    const workplacesWithCounts = activeWorkplaces.map((wp) => ({
      name: wp.name,
      shifts: shiftCountMap.get(wp.id) ?? 0,
    }));

    // Sort by descending shift count; break ties alphabetically by name
    workplacesWithCounts.sort((a, b) => {
      if (b.shifts !== a.shifts) {
        return b.shifts - a.shifts;
      }
      return a.name.localeCompare(b.name);
    });

    // Select the top 3 workplaces
    const topThree = workplacesWithCounts.slice(0, 3);

    // Print the result as a JSON array; no extra console output
    console.log(JSON.stringify(topThree));
  } catch (err) {
    // In case of error, log it and exit with a non‑zero code
    console.error(err);
    process.exit(1);
  } finally {
    // Always disconnect the Prisma client
    await prisma.$disconnect();
  }
}

main();
