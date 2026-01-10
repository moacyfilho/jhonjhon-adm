const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando agendamentos da Manuela...\n');
  
  // Buscar agendamentos com cliente "Manuela"
  const appointments = await prisma.appointment.findMany({
    where: {
      client: {
        name: {
          contains: 'Manuela',
          mode: 'insensitive'
        }
      }
    },
    include: {
      client: true,
      barber: true,
      services: {
        include: {
          service: true
        }
      }
    },
    orderBy: {
      date: 'asc'
    }
  });
  
  if (appointments.length === 0) {
    console.log('❌ Nenhum agendamento encontrado para Manuela');
  } else {
    console.log(`✅ Encontrados ${appointments.length} agendamento(s):\n`);
    
    appointments.forEach((apt, index) => {
      const dateUTC = new Date(apt.date);
      const dateManaus = new Date(dateUTC);
      dateManaus.setHours(dateManaus.getHours() - 4); // Converter para Manaus
      
      console.log(`📅 Agendamento ${index + 1}:`);
      console.log(`   ID: ${apt.id}`);
      console.log(`   Cliente: ${apt.client.name}`);
      console.log(`   Barbeiro: ${apt.barber.name}`);
      console.log(`   Data UTC: ${dateUTC.toISOString()}`);
      console.log(`   Data Manaus: ${dateManaus.toLocaleString('pt-BR')}`);
      console.log(`   Status: ${apt.status}`);
      console.log(`   Serviços: ${apt.services.map(s => s.service.name).join(', ')}`);
      console.log(`   Valor: R$ ${apt.totalAmount.toFixed(2)}`);
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
