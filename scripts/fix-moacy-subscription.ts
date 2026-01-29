import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMoacySubscription() {
    try {
        // Find Moacy's client
        const client = await prisma.client.findFirst({
            where: {
                name: {
                    contains: 'Moacy',
                    mode: 'insensitive'
                }
            }
        });

        if (!client) {
            console.log('Cliente Moacy não encontrado');
            return;
        }

        console.log('Cliente encontrado:', client.name);

        // Update his subscription to exclusive
        const updated = await prisma.subscription.updateMany({
            where: {
                clientId: client.id
            },
            data: {
                isExclusive: true
            }
        });

        console.log(`✅ ${updated.count} assinatura(s) atualizada(s) para exclusiva`);

        // Verify
        const subscriptions = await prisma.subscription.findMany({
            where: {
                clientId: client.id
            },
            include: {
                client: true
            }
        });

        console.log('\nAssinaturas do Moacy:');
        subscriptions.forEach(sub => {
            console.log(`- ${sub.planName}: isExclusive = ${sub.isExclusive}`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateMoacySubscription();
