import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateSubscriptions() {
    try {
        const clientsToFix = ['SANDRA DE ALMEIDA', 'DARLENE SOUZA'];

        for (const namePart of clientsToFix) {
            console.log(`Buscando cliente com nome: ${namePart}`);
            const client = await prisma.client.findFirst({
                where: {
                    name: {
                        contains: namePart,
                        mode: 'insensitive'
                    }
                }
            });

            if (client) {
                console.log(`Cliente encontrado: ${client.name}`);

                // Update subscription to exclusive
                const updated = await prisma.subscription.updateMany({
                    where: {
                        clientId: client.id
                    },
                    data: {
                        isExclusive: true
                    } as any
                });

                console.log(`✅ ${updated.count} assinatura(s) atualizada(s) para exclusiva`);
            } else {
                console.log(`❌ Cliente não encontrado: ${namePart}`);
            }
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicateSubscriptions();
