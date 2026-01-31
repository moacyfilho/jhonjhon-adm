import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Diagnóstico de Dados ---');

    const counts = await prisma.accountReceivable.count({
        where: { category: 'SUBSCRIPTION' }
    });
    console.log(`Total de contas na categoria SUBSCRIPTION: ${counts}`);

    const recent = await prisma.accountReceivable.findMany({
        where: { category: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { subscription: true, client: true }
    });

    recent.forEach(r => {
        console.log(`ID: ${r.id}, Desc: ${r.description}, Payer: ${r.payer}, SubId: ${r.subscriptionId}, Exclusive: ${r.subscription?.isExclusive}, Client: ${r.client?.name}`);
    });

    const exclusiveSubs = await prisma.subscription.findMany({
        include: { client: true }
    });
    console.log(`\nTotal de Assinaturas: ${exclusiveSubs.length}`);
    exclusiveSubs.forEach(s => {
        console.log(`Sub ID: ${s.id}, Client: ${s.client?.name}, Plan: ${s.planName}, Exclusive: ${s.isExclusive}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
