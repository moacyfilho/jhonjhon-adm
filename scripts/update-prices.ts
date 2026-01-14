
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating subscription prices...');

    // Update Jhonjhon Club Corte to 69.90
    const updateCorte = await prisma.subscription.updateMany({
        where: {
            planName: 'Jhonjhon Club Corte',
        },
        data: {
            amount: 69.90,
        },
    });

    console.log(`Updated price for ${updateCorte.count} subscriptions of "Jhonjhon Club Corte" to R$ 69,90`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
