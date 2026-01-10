const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando TODOS os agendamentos do dia 08/01/2026...\n');
  
  // Criar data de início e fim para o dia 08/01 em Manaus
  // Manaus 00:00 do dia 08 = UTC 04:00 do dia 08
  // Manaus 23:59 do dia 08 = UTC 03:59 do dia 09
  const startUTC = new Date('2026-01-08T04:00:00.000Z');
  const endUTC = new Date('2026-01-09T03:59:59.999Z');
  
  console.log('📅 Período de busca (UTC):');
  console.log(`   Início: ${startUTC.toISOString()}`);
  console.log(`   Fim: ${endUTC.toISOString()}\n`);
  
  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startUTC,
        lte: endUTC,
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
    console.log('❌ Nenhum agendamento encontrado para 08/01/2026');
  } else {
    console.log(`✅ Encontrados ${appointments.length} agendamento(s):\n`);
    
    // Agrupar por barbeiro
    const byBarber = {};
    appointments.forEach((apt) => {
      const barberName = apt.barber.name;
      if (!byBarber[barberName]) {
        byBarber[barberName] = [];
      }
      byBarber[barberName].push(apt);
    });
    
    Object.keys(byBarber).forEach((barberName) => {
      console.log(`\n💈 Barbeiro: ${barberName}`);
      console.log('─'.repeat(50));
      
      byBarber[barberName].forEach((apt, index) => {
        const dateUTC = new Date(apt.date);
        const dateManaus = new Date(dateUTC);
        dateManaus.setHours(dateManaus.getHours() - 4);
        
        console.log(`  ${index + 1}. ${apt.client.name}`);
        console.log(`     Horário: ${dateManaus.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`);
        console.log(`     Status: ${apt.status}`);
        console.log(`     Serviços: ${apt.services.map(s => s.service.name).join(', ')}`);
        console.log(`     Valor: R$ ${apt.totalAmount.toFixed(2)}`);
      });
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
