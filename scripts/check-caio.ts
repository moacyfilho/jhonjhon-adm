
import { prisma } from "@/lib/db";

async function checkCaio() {
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'Caio troy', mode: 'insensitive' } }
    });

    if (!client) {
        console.log("Client not found");
        return;
    }

    console.log("Client found:", client.name, client.id, "Subscriber:", client.isSubscriber);

    const appointment = await prisma.appointment.findFirst({
        where: {
            clientId: client.id,
            date: {
                gte: new Date('2026-02-18T00:00:00.000Z'),
                lt: new Date('2026-02-19T00:00:00.000Z')
            }
        },
        include: {
            services: { include: { service: true } }
        }
    });

    if (appointment) {
        console.log("Appointment found:");
        console.log("ID:", appointment.id);
        console.log("Total Amount:", appointment.totalAmount);
        console.log("Services:", appointment.services.map(s => s.service.name));
        console.log("Is Subscription Appt:", appointment.isSubscriptionAppointment);
    } else {
        console.log("No appointment found for today");
    }
}

checkCaio();
