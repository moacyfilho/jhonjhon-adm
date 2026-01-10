
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phone = '(92) 98170-8066';
    const clients = await prisma.client.findMany({
        where: { phone }
    });

    console.log(`Found ${clients.length} clients with phone ${phone}:`);
    clients.forEach(c => console.log(`- ${c.id}: ${c.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
