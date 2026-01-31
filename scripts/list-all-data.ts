import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Listando todas as Assinaturas ---');

    const subs = await prisma.subscription.findMany({
        include: { client: true }
    });

    for (const s of subs) {
        console.log(`Sub ID: ${s.id}, Client: ${s.client?.name}, Plan: ${s.planName}, Exclusive: ${s.isExclusive}`);
    }

    console.log('\n--- Listando Financeiro (SUBSCRIPTION) ---');
    const recs = await prisma.accountReceivable.findMany({
        where: { category: 'SUBSCRIPTION' },
        include: { subscription: true, client: true }
    });

    for (const r of recs) {
        console.log(`ID: ${r.id}, Desc: ${r.description}, Status: ${r.status}, Payer: ${r.payer}, SubId: ${r.subscriptionId}, Exclusive: ${r.subscription?.isExclusive}, PaymentDate: ${r.paymentDate}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
