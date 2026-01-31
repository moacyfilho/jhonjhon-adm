import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const prisma = new PrismaClient();

async function checkReport() {
    const referenceDate = new Date(); // Janeiro 2026
    const startDate = startOfMonth(referenceDate);
    const endDate = endOfMonth(referenceDate);

    console.log('--- Diagnóstico de Relatório ---');
    console.log(`Range: ${startDate} até ${endDate}`);

    const rawReceivables = await prisma.accountReceivable.findMany({
        where: { category: 'SUBSCRIPTION' },
        include: { subscription: true }
    });

    const exclusiveSubs = await prisma.subscription.findMany({
        where: { isExclusive: true }
    });

    console.log(`Assinaturas Exclusivas: ${exclusiveSubs.length}`);

    const subscriberList = exclusiveSubs.map(sub => {
        const paidReceivable = rawReceivables.find(r =>
            r.clientId === sub.clientId &&
            r.status === 'PAID' &&
            r.paymentDate &&
            isWithinInterval(r.paymentDate, { start: startDate, end: endDate })
        );

        return {
            name: sub.planName,
            amount: sub.amount,
            isPaid: !!paidReceivable
        };
    });

    console.log('Resultado da Lista:');
    subscriberList.forEach(s => console.log(` - ${s.name}: ${s.amount}, Pago: ${s.isPaid}`));

    const receivedAmount = subscriberList
        .filter(s => s.isPaid)
        .reduce((sum, s) => sum + s.amount, 0);

    console.log(`Total Recebido Calculado: R$ ${receivedAmount}`);
}

checkReport()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
