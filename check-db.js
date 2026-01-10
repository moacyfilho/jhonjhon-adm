
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const onlineBookings = await prisma.onlineBooking.findMany({
        include: {
            service: true,
            barber: true,
        }
    });

    console.log('--- ONLINE BOOKINGS ---');
    onlineBookings.forEach(b => {
        console.log(`ID: ${b.id}, Client: ${b.clientName}, Date: ${b.scheduledDate.toISOString()}, Status: ${b.status}, Barber: ${b.barber?.name}`);
    });

    const appointments = await prisma.appointment.findMany({
        include: {
            client: true,
            barber: true,
        }
    });

    console.log('\n--- APPOINTMENTS ---');
    appointments.forEach(a => {
        console.log(`ID: ${a.id}, Client: ${a.client?.name}, Date: ${a.date.toISOString()}, Status: ${a.status}, Barber: ${a.barber?.name}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
