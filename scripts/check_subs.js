
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.subscription.count();
        console.log(`Total Subscriptions: ${count}`);

        if (count > 0) {
            const subs = await prisma.subscription.findMany({
                take: 5,
                include: { client: true }
            });
            console.log('First 5 subscriptions:', JSON.stringify(subs, null, 2));
        } else {
            console.log('No subscriptions found in the database.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
