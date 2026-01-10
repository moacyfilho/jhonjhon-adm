const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando agendamentos online...\n');
  
  const bookings = await prisma.onlineBooking.findMany({
    include: {
      service: true,
      barber: true,
      client: true,
    },
    orderBy: {
      scheduledDate: 'desc'
    },
    take: 10
  });
  
  console.log(`✅ Total de agendamentos online: ${bookings.length}\n`);
  
  bookings.forEach((booking, index) => {
    console.log(`${index + 1}. ${booking.clientName}`);
    console.log(`   ID: ${booking.id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Data: ${booking.scheduledDate}`);
    console.log(`   Barbeiro: ${booking.barber?.name || 'Não atribuído'}`);
    console.log(`   Serviço: ${booking.service.name}`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
