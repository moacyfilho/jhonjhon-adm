
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Iniciando limpeza de Clientes e Atendimentos...');

    // 1. Delete Online Bookings
    console.log(' - Excluindo Agendamentos Online...');
    await prisma.onlineBookingService.deleteMany({});
    await prisma.onlineBooking.deleteMany({});

    // 2. Delete Appointments and related
    console.log(' - Excluindo Atendimentos, Comissões e Serviços...');
    await prisma.commission.deleteMany({});
    await prisma.appointmentProduct.deleteMany({});
    await prisma.appointmentService.deleteMany({});
    await prisma.appointment.deleteMany({});

    // 3. Delete Subscriptions and Usage
    console.log(' - Excluindo Assinaturas e Histórico...');
    await prisma.subscriptionUsage.deleteMany({});
    // Need to unlink ARs first or delete ARs first?
    // AR has foreign key to Subscription.
    // If we delete ARs, we are good.

    // 4. Delete AccountReceivables linked to Clients
    console.log(' - Excluindo Contas a Receber de Clientes...');
    await prisma.accountReceivable.deleteMany({
        where: {
            OR: [
                { clientId: { not: null } },
                { subscriptionId: { not: null } }
            ]
        }
    });

    // Now delete Subscriptions
    await prisma.subscription.deleteMany({});

    // 5. Delete Clients
    console.log(' - Excluindo Clientes...');
    await prisma.client.deleteMany({});

    console.log('✅ Limpeza concluída com sucesso! (Barbeiros, Serviços e Configurações foram mantidos)');
}

main()
    .catch((e) => {
        console.error('❌ Erro ao limpar dados:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
