import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verificando Caio, Luciano e João ---');

    const names = ['Caio troy', 'Luciano', 'João Gabriel'];

    for (const name of names) {
        const client = await prisma.client.findFirst({
            where: { name: { contains: name, mode: 'insensitive' } },
            include: {
                subscriptions: true,
                accountsReceivable: {
                    where: { category: 'SUBSCRIPTION' },
                    include: { subscription: true }
                }
            }
        });

        if (client) {
            console.log(`\nCliente: ${client.name} (ID: ${client.id})`);
            console.log(`Assinaturas (${client.subscriptions.length}):`);
            client.subscriptions.forEach(s => {
                console.log(` - ID: ${s.id}, Plano: ${s.planName}, Exclusiva (BD): ${s.isExclusive}`);
            });
            console.log(`Financeiro (${client.accountsReceivable.length}):`);
            client.accountsReceivable.forEach(r => {
                console.log(` - ID: ${r.id}, Desc: ${r.description}, Status: ${r.status}, SubId: ${r.subscriptionId}, SubExclusiva: ${r.subscription?.isExclusive}, Pagamento: ${r.paymentDate}`);
            });
        } else {
            console.log(`\nCliente "${name}" não encontrado.`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
