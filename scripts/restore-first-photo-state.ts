import { PrismaClient, AccountStatus, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando limpeza e restauração de assinantes exclusivos ---');

    // 1. Identificar e Deletar Sandra e Darlene (Segundo a segunda foto)
    const clientsToDelete = ['SANDRA DE ALMEIDA MARQUES', 'DARLENE SOUZA DA SILVA'];

    for (const name of clientsToDelete) {
        const client = await prisma.client.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } }
        });

        if (client) {
            console.log(`Limpando dados de: ${client.name}`);
            // O Prisma vai deletar em cascata se configurado, senão deletamos manualmente
            await prisma.accountReceivable.deleteMany({ where: { clientId: client.id } });
            await prisma.subscription.deleteMany({ where: { clientId: client.id } });
            await prisma.client.delete({ where: { id: client.id } });
            console.log(`✅ ${client.name} removido.`);
        }
    }

    // 2. Restaurar Assinantes (Segundo a primeira foto)
    const subscribersToRestore = [
        { name: 'Caio troy', phone: '92984711966', amount: 99.90, billingDay: 27, planName: 'Assinatura Exclusiva - Corte' },
        { name: 'Luciano', phone: '92994912494', amount: 99.90, billingDay: 10, planName: 'Assinatura Exclusiva - Corte' },
        { name: 'João Gabriel', phone: '21972382729', amount: 199.90, billingDay: 30, planName: 'Assinatura Exclusiva - Corte + Barba' }
    ];

    for (const subData of subscribersToRestore) {
        console.log(`Restaurando assinante: ${subData.name}`);

        // UPSERT Cliente
        const client = await prisma.client.upsert({
            where: { id: `fixed-${subData.name.toLowerCase().replace(' ', '-')}` }, // Usando ID fixo para evitar duplicatas em múltiplos runs
            update: { phone: subData.phone },
            create: {
                id: `fixed-${subData.name.toLowerCase().replace(' ', '-')}`,
                name: subData.name,
                phone: subData.phone
            }
        });

        // Criar Assinatura
        const subscription = await prisma.subscription.create({
            data: {
                clientId: client.id,
                planName: subData.planName,
                amount: subData.amount,
                billingDay: subData.billingDay,
                status: SubscriptionStatus.ACTIVE,
                isExclusive: true,
                startDate: new Date(),
                observations: 'Restaurado via script'
            } as any
        });

        // Criar Conta a Receber Paga (para aparecer verde na foto)
        await prisma.accountReceivable.create({
            data: {
                description: `Assinatura - ${subData.planName}`,
                category: 'SUBSCRIPTION',
                payer: client.name,
                clientId: client.id,
                phone: client.phone,
                amount: subData.amount,
                dueDate: new Date(),
                paymentDate: new Date(), // Pago hoje
                status: AccountStatus.PAID,
                subscriptionId: subscription.id,
                observations: 'Restaurado via script'
            }
        });

        console.log(`✅ ${subData.name} restaurado com sucesso.`);
    }

    console.log('--- Limpeza e restauração finalizadas ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
