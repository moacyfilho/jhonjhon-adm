import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando script de correção definitiva ---');

    // 1. Buscar todas as assinaturas marcadas como exclusivas
    const exclusiveSubscriptions = await prisma.subscription.findMany({
        where: {
            OR: [
                { isExclusive: true },
                { planName: { contains: 'Exclusiva', mode: 'insensitive' } }
            ]
        },
        include: { client: true }
    });

    console.log(`Encontradas ${exclusiveSubscriptions.length} assinaturas exclusivas.`);

    for (const sub of exclusiveSubscriptions) {
        if (!sub.isExclusive) {
            console.log(`Marcando assinatura ${sub.id} (${sub.planName}) como exclusiva.`);
            await prisma.subscription.update({
                where: { id: sub.id },
                data: { isExclusive: true }
            });
        }

        // 2. Buscar contas a receber vinculadas ao cliente desta assinatura que sejam de categoria SUBSCRIPTION
        // mas que não tenham o subscriptionId preenchido ou que tenham "Exclusiva" no nome
        const receivables = await prisma.accountReceivable.findMany({
            where: {
                clientId: sub.clientId,
                category: 'SUBSCRIPTION',
                OR: [
                    { subscriptionId: null },
                    { description: { contains: 'Exclusiva', mode: 'insensitive' } }
                ]
            }
        });

        console.log(`Processando ${receivables.length} contas para o cliente ${sub.client.name}`);

        for (const rec of receivables) {
            if (!rec.subscriptionId) {
                console.log(`- Vinculando conta ${rec.id} ("${rec.description}") à assinatura ${sub.id}`);
                await prisma.accountReceivable.update({
                    where: { id: rec.id },
                    data: { subscriptionId: sub.id }
                });
            }
        }
    }

    // 3. Caso existam contas sem clientId mas com descrição indicando assinatura exclusiva, tentar resolver pelo nome do pagador
    const orphanReceivables = await prisma.accountReceivable.findMany({
        where: {
            category: 'SUBSCRIPTION',
            subscriptionId: null,
            description: { contains: 'Exclusiva', mode: 'insensitive' }
        }
    });

    console.log(`Encontradas ${orphanReceivables.length} contas órfãs com "Exclusiva" na descrição.`);

    for (const rec of orphanReceivables) {
        if (rec.payer) {
            // Tentar achar um cliente com esse nome que tenha assinatura exclusiva
            const client = await prisma.client.findFirst({
                where: { name: { contains: rec.payer, mode: 'insensitive' } },
                include: { subscriptions: { where: { isExclusive: true } } }
            });

            if (client && client.subscriptions.length > 0) {
                console.log(`- Resolvendo conta órfã ${rec.id} para o cliente ${client.name}`);
                await prisma.accountReceivable.update({
                    where: { id: rec.id },
                    data: {
                        clientId: client.id,
                        subscriptionId: client.subscriptions[0].id
                    }
                });
            }
        }
    }

    console.log('--- Script finalizado com sucesso ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
