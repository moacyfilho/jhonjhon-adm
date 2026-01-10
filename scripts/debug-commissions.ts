
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const commissions = await prisma.commission.findMany({});
        console.log(`Found ${commissions.length} commissions remaining.`);
        if (commissions.length > 0) {
            console.log('Sample:', commissions[0]);
        }

        const appointments = await prisma.appointment.findMany({
            where: { workedHours: { gt: 0 } }
        });
        console.log(`Found ${appointments.length} appointments with > 0 hours.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
