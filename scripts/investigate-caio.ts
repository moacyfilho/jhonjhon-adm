
import { prisma } from "@/lib/db";

async function investigateCaio() {
    console.log("Investigating Caio Troy's appointments for 18/02/2026...");

    // Broad search by name
    const clients = await prisma.client.findMany({
        where: { name: { contains: 'Caio', mode: 'insensitive' } }
    });

    if (clients.length === 0) {
        console.log("No client found with name 'Caio'");
        return;
    }

    const clientIds = clients.map(c => c.id);
    console.log(`Found ${clients.length} clients matching 'Caio':`, clients.map(c => `${c.name} (Subscriber: ${c.isSubscriber})`).join(", "));

    // Search appointments for these clients on Feb 18th (UTC day range)
    const start = new Date('2026-02-18T00:00:00Z');
    const end = new Date('2026-02-18T23:59:59Z');

    const apps = await prisma.appointment.findMany({
        where: {
            clientId: { in: clientIds },
            date: { gte: start, lte: end }
        },
        include: { client: true, services: { include: { service: true } } }
    });

    if (apps.length === 0) {
        console.log("No appointments found for Caio on 18/02.");
    } else {
        console.log(`Found ${apps.length} appointments:`);
        apps.forEach(a => {
            console.log(`ID: ${a.id}`);
            console.log(`Client: ${a.client.name}`);
            console.log(`Date: ${a.date.toISOString()}`);
            console.log(`Status: ${a.status}`);
            console.log(`Total Amount: ${a.totalAmount}`);
            console.log(`Is Subscription App: ${a.isSubscriptionAppointment}`);
            console.log(`Services: ${a.services.map(s => s.service.name + ' (' + s.price + ')').join(', ')}`);
            console.log('---');
        });
    }
}

investigateCaio()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
