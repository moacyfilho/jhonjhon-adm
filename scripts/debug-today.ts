
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

async function debugToday() {
    // Simulate the request for today (2026-02-18)
    const dateStr = '2026-02-18';
    const date = new Date(dateStr);

    const start = startOfDay(date);
    const end = endOfDay(date);

    console.log(`Checking Window: ${start.toISOString()} to ${end.toISOString()}`);

    const allApps = await prisma.appointment.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            }
        },
        include: { client: true }
    });

    console.log(`Total appointments found today: ${allApps.length}`);

    allApps.forEach(a => {
        console.log(`- [${a.status}] ${a.client.name}: R$ ${a.totalAmount} (${a.date.toISOString()})`);
    });

    const completed = allApps.filter(a => a.status === 'COMPLETED');
    const sum = completed.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    console.log(`Sum of COMPLETED: R$ ${sum}`);
}

debugToday()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
