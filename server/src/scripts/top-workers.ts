import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Fetch all active workers (status 0 = ACTIVE)
    const activeWorkers = await prisma.worker.findMany({
      where: { status: 0 },
      select: { id: true, name: true },
    });

    // Retrieve all completed shifts
    const completedShifts = await prisma.shift.findMany({
      where: {
        workerId: { not: null },
        cancelledAt: null,
      },
      select: { workerId: true },
    });

    // Count completed shifts per worker
    const shiftCountMap = new Map<number, number>();
    for (const shift of completedShifts) {
      const id = shift.workerId!;
      const current = shiftCountMap.get(id) ?? 0;
      shiftCountMap.set(id, current + 1);
    }

    // Build an array of active workers with their completed shift counts (default to 0)
    const workersWithCounts = activeWorkers.map((worker) => ({
      name: worker.name,
      shifts: shiftCountMap.get(worker.id) ?? 0,
    }));

    // Sort by descending shift count; break ties alphabetically by name
    workersWithCounts.sort((a, b) => {
      if (b.shifts !== a.shifts) {
        return b.shifts - a.shifts;
      }
      return a.name.localeCompare(b.name);
    });

    // Select the top 3 workers
    const topThree = workersWithCounts.slice(0, 3);

    // Print the result as a JSON array; no extra console output
    console.log(JSON.stringify(topThree));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
