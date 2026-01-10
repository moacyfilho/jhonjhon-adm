const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando agendamentos do Jhon Jhon às 19h...\n');
  
  // Buscar todos os agendamentos do Jhon Jhon
  const appointments = await prisma.appointment.findMany({
    where: {
      barber: {
        name: {
          contains: 'jhon',
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
  
  console.log(`✅ Total de agendamentos do Jhon Jhon: ${appointments.length}\n`);
  
  appointments.forEach((apt, index) => {
    const dateUTC = new Date(apt.date);
    const dateManaus = new Date(dateUTC);
    dateManaus.setHours(dateManaus.getHours() - 4);
    
    const hour = dateManaus.getHours();
    const emoji = hour === 19 ? '🎯' : '  ';
    
    console.log(`${emoji} ${index + 1}. ${apt.client.name}`);
    console.log(`   Horário Manaus: ${dateManaus.toLocaleString('pt-BR')}`);
    console.log(`   Horário UTC: ${dateUTC.toISOString()}`);
    console.log(`   Status: ${apt.status}`);
    console.log(`   Serviços: ${apt.services.map(s => s.service.name).join(', ')}`);
    console.log('');
  });
  
  // Procurar especificamente horários às 19h
  const at19h = appointments.filter(apt => {
    const dateManaus = new Date(apt.date);
    dateManaus.setHours(dateManaus.getHours() - 4);
    return dateManaus.getHours() === 19;
  });
  
  if (at19h.length > 0) {
    console.log(`\n🎯 Encontrado ${at19h.length} agendamento(s) às 19h!`);
  } else {
    console.log('\n❌ Nenhum agendamento encontrado às 19h para o Jhon Jhon.');
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
