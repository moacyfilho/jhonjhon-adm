
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = 'cmk77pm170007d4a4434186ey'; // New ID from user request
    const booking = await prisma.onlineBooking.findUnique({
        where: { id },
        include: { barber: true, service: true }
    });

    if (!booking) {
        console.log(`Booking ${id} not found.`);
        // Let's check all bookings to be sure
        const all = await prisma.onlineBooking.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
        console.log('Recent bookings:');
        all.forEach(b => console.log(`- ${b.id}: ${b.clientName} (Barber: ${b.barberId})`));
        return;
    }

    console.log('--- BOOKING DETAILS ---');
    console.log(JSON.stringify(booking, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
