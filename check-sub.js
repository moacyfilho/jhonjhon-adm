const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const term = "Alexson Brito";

    // Find client
    const clients = await prisma.client.findMany({
        where: {
            name: { contains: term, mode: 'insensitive' }
        },
        include: {
            subscriptions: {
                where: { status: 'ACTIVE' },
                include: { plan: true }
            }
        }
    });

    if (clients.length === 0) {
        console.log("No client found.");
        return;
    }

    for (const client of clients) {
        console.log(`\nClient: ${client.name}`);
        console.log("Active Subscriptions:", client.subscriptions.length);

        client.subscriptions.forEach(sub => {
            console.log(`  - Plan In Sub: ${sub.planName}`);
            console.log(`    Sub.ServicesIncluded: '${sub.servicesIncluded}'`);
            console.log(`    Plan.ServicesIncluded: '${sub.plan?.servicesIncluded}'`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
