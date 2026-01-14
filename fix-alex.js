const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clientName = "Alex Nascimento";
    const targetDateStart = new Date("2026-01-13T00:00:00.000Z"); // UTC or local? Assuming UTC for query range
    const targetDateEnd = new Date("2026-01-14T00:00:00.000Z");

    console.log(`Searching appointment for ${clientName} on 2026-01-13...`);

    const appointments = await prisma.appointment.findMany({
        where: {
            client: { name: { contains: clientName, mode: 'insensitive' } },
            date: {
                gte: new Date("2026-01-13T00:00:00-04:00"), // Manaus time adjustment approximation
                lt: new Date("2026-01-14T00:00:00-04:00")
            }
        },
        include: {
            client: { include: { subscriptions: { where: { status: 'ACTIVE' } } } },
            services: { include: { service: true } }
        }
    });

    if (appointments.length === 0) {
        console.log("No appointment found.");
        // Try wider search
        const all = await prisma.appointment.findMany({
            where: { client: { name: { contains: clientName } } },
            take: 5,
            orderBy: { date: 'desc' }
        });
        console.log("Recent appointments for Alex:", all.map(a => `${a.date} - ${a.totalAmount}`));
        return;
    }

    for (const appt of appointments) {
        console.log(`Found Appointment: ${appt.id}`);
        console.log(`Date: ${appt.date}`);
        console.log(`Total: ${appt.totalAmount}`);
        console.log(`Services: ${appt.services.map(s => s.service.name).join(', ')}`);

        const sub = appt.client.subscriptions[0];
        if (sub) {
            console.log(`Has Active Subscription: ${sub.planName}`);
            // Fix it
            console.log("Updating Total Amount to 0...");
            await prisma.appointment.update({
                where: { id: appt.id },
                data: { totalAmount: 0 }
            });
            console.log("DONE.");
        } else {
            console.log("No active subscription found for this client on appointment.");
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
