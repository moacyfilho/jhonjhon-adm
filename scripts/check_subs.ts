import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentSubscriptions() {
    try {
        const subscriptions = await prisma.subscription.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { client: true }
        });

        console.log('Últimas 5 assinaturas:');
        subscriptions.forEach(sub => {
            console.log(`- Cliente: ${sub.client.name}`);
            console.log(`  Plano: ${sub.planName}`);
            console.log(`  isExclusive: ${sub.isExclusive}`); // Verificando o campo
            console.log('---');
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecentSubscriptions();
