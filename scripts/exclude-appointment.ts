
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const appointmentId = 'cmkyw24d8001fd4q46bvf0ww2'; // ID obtido no diagnóstico anterior (30/01/2026)

    console.log(`🔍 Buscando agendamento: ${appointmentId}`);

    const apt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true }
    });

    if (!apt) {
        console.log('❌ Agendamento não encontrado.');
        return;
    }

    console.log(`✅ Agendamento encontrado:`);
    console.log(`   Cliente: ${apt.client?.name}`);
    console.log(`   Data: ${apt.date.toISOString()}`);
    console.log(`   É Assinatura? ${apt.isSubscriptionAppointment}`);
    console.log(`   Status: ${apt.status}`);

    if (!apt.isSubscriptionAppointment) {
        console.log('⚠️ Este agendamento já não conta como assinatura.');
        return;
    }

    // Update only the boolean flag
    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
            isSubscriptionAppointment: false
        }
    });

    console.log(`\n✅ Atualizado com sucesso!`);
    console.log(`   Agora 'isSubscriptionAppointment' é: ${updated.isSubscriptionAppointment}`);
    console.log('   Ele não aparecerá mais nos cálculos do relatório de assinaturas.');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
