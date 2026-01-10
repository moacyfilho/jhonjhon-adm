
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const dateStr = '2026-01-09';
    const dateObj = new Date(dateStr);

    // LOGICA ANTIGA (Aproximada, pois depende do local do servidor)
    // Se o servidor for Manaus (GMT-4):
    // new Date('2026-01-09') -> UTC 00:00 (Manaus 20:00 Jan 8th)
    // .setHours(0) -> Local 00:00 Jan 8th -> UTC 04:00 Jan 8th

    const startOld = new Date(dateObj);
    // Simulando setHours(0) em Manaus (GMT-4)
    startOld.setUTCHours(4, 0, 0, 0);
    startOld.setUTCDate(startOld.getUTCDate() - 1);

    const endOld = new Date(dateObj);
    endOld.setUTCHours(3, 59, 59, 999);

    console.log('--- LOGICA ANTIGA (Estimada) ---');
    console.log(`Range: ${startOld.toISOString()} to ${endOld.toISOString()}`);

    const bookingsOld = await prisma.onlineBooking.findMany({
        where: {
            scheduledDate: {
                gte: startOld,
                lte: endOld,
            }
        }
    });
    console.log(`Encontrados: ${bookingsOld.length}`);

    // LOGICA NOVA
    const startNew = new Date(dateObj);
    startNew.setUTCHours(4, 0, 0, 0);

    const endNew = new Date(dateObj);
    endNew.setUTCDate(endNew.getUTCDate() + 1);
    endNew.setUTCHours(3, 59, 59, 999);

    console.log('\n--- LOGICA NOVA ---');
    console.log(`Range: ${startNew.toISOString()} to ${endNew.toISOString()}`);

    const bookingsNew = await prisma.onlineBooking.findMany({
        where: {
            scheduledDate: {
                gte: startNew,
                lte: endNew,
            }
        }
    });
    console.log(`Encontrados: ${bookingsNew.length}`);
    bookingsNew.forEach(b => console.log(`  - ${b.clientName} @ ${b.scheduledDate.toISOString()}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
