import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verificando agendamentos online...\n');

    const bookings = await prisma.onlineBooking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            barber: true,
            services: true,
        },
    });

    if (bookings.length === 0) {
        console.log('❌ Nenhum agendamento online encontrado!');
    } else {
        console.log(`✅ Encontrados ${bookings.length} agendamentos:\n`);
        bookings.forEach((booking, index) => {
            console.log(`${index + 1}. ${booking.clientName}`);
            console.log(`   📅 Data: ${booking.scheduledDate}`);
            console.log(`   ⏰ Hora: ${booking.scheduledTime}`);
            console.log(`   💈 Barbeiro: ${booking.barber.name}`);
            console.log(`   📊 Status: ${booking.status}`);
            console.log(`   🆔 ID: ${booking.id}`);
            console.log(`   📝 Criado em: ${booking.createdAt}`);
            console.log('');
        });
    }

    console.log('\n🔍 Verificando agendamentos normais (Appointment)...\n');

    const appointments = await prisma.appointment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            barber: true,
            client: true,
        },
    });

    if (appointments.length === 0) {
        console.log('❌ Nenhum agendamento normal encontrado!');
    } else {
        console.log(`✅ Encontrados ${appointments.length} agendamentos:\n`);
        appointments.forEach((apt, index) => {
            console.log(`${index + 1}. ${apt.client?.name || 'Cliente sem nome'}`);
            console.log(`   📅 Data/Hora: ${apt.scheduledFor}`);
            console.log(`   💈 Barbeiro: ${apt.barber.name}`);
            console.log(`   📊 Status: ${apt.status}`);
            console.log(`   🆔 ID: ${apt.id}`);
            console.log('');
        });
    }
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
