import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Find Padrinho Paiva
    const bookings = await prisma.onlineBooking.findMany({
        where: {
            clientName: { contains: 'Padrinho', mode: 'insensitive' },
            // Just approximate date to be safe
            scheduledDate: {
                gte: new Date('2026-02-17T00:00:00Z'),
                lt: new Date('2026-02-18T00:00:00Z'),
            }
        },
        include: {
            services: { include: { service: true } },
            service: true,
            barber: true
        }
    });

    console.log(`Found ${bookings.length} bookings.`);

    for (const booking of bookings) {
        console.log('Booking:', {
            id: booking.id,
            client: booking.clientName,
            date: booking.scheduledDate,
            barber: booking.barber?.name,
            serviceLegacy: booking.service?.name,
            servicesRelation: booking.services.map(s => ({
                name: s.service.name,
                duration: s.service.duration,
                price: s.service.price
            }))
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
