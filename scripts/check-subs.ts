
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const subscriptions = await prisma.subscription.groupBy({
        by: ['planName'],
        _count: {
            planName: true,
        },
    });

    console.log('Current Subscription Names:', subscriptions);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
