import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('📅 Criando agendamentos de teste...\n');

  // Buscar dados necessários
  const barbers = await prisma.barber.findMany();
  const clients = await prisma.client.findMany();
  const services = await prisma.service.findMany();

  if (barbers.length === 0 || clients.length === 0 || services.length === 0) {
    console.error('❌ Erro: Certifique-se de que há barbeiros, clientes e serviços cadastrados.');
    return;
  }

  console.log(`✅ Encontrados: ${barbers.length} barbeiros, ${clients.length} clientes, ${services.length} serviços\n`);

  // Criar data base (hoje + 1 dia às 14:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  // Converter para UTC (Manaus é GMT-4, então adicionamos 4 horas)
  const tomorrowUTC = new Date(tomorrow);
  tomorrowUTC.setHours(tomorrowUTC.getHours() + 4);

  // Criar 3 agendamentos de teste
  const appointments = [];

  for (let i = 0; i < 3; i++) {
    const barber = barbers[i % barbers.length];
    const client = clients[i % clients.length];
    const service = services[i % services.length];

    // Calcular horário (intervalos de 1 hora)
    const appointmentDate = new Date(tomorrowUTC);
    appointmentDate.setHours(appointmentDate.getHours() + i);

    // Criar o agendamento com seus serviços relacionados
    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId: barber.id,
        date: appointmentDate,
        status: 'SCHEDULED',
        totalAmount: service.price,
        paymentMethod: 'CASH',
        observations: `Agendamento de teste ${i + 1}`,
        services: {
          create: {
            serviceId: service.id,
            price: service.price,
          },
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    appointments.push(appointment);

    const localTime = new Date(appointmentDate);
    localTime.setHours(localTime.getHours() - 4); // Converter de volta para Manaus

    console.log(`✅ Agendamento ${i + 1} criado:`);
    console.log(`   📍 Cliente: ${client.name}`);
    console.log(`   💇 Barbeiro: ${barber.name}`);
    console.log(`   ✂️  Serviço: ${service.name}`);
    console.log(`   🕐 Horário: ${localTime.toLocaleString('pt-BR')}`);
    console.log(`   💰 Valor: R$ ${service.price.toFixed(2)}\n`);
  }

  console.log(`\n✨ ${appointments.length} agendamentos de teste criados com sucesso!`);
  console.log('🌐 Acesse a agenda visual em: /agenda');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
