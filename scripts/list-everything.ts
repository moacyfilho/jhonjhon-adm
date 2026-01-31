import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Listando TODOS os Clientes ---');
    const allClients = await prisma.client.findMany({
        select: { id: true, name: true }
    });
    allClients.forEach(c => console.log(`ID: ${c.id}, Nome: ${c.name}`));

    console.log('\n--- Listando TODAS as Assinaturas ---');
    const allSubs = await prisma.subscription.findMany({
        include: { client: true }
    });
    allSubs.forEach(s => console.log(`ID: ${s.id}, Cliente: ${s.client?.name}, Plano: ${s.planName}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
