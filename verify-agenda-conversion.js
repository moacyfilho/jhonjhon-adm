const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Importar a função toManausTime do módulo timezone
function toManausTime(date) {
  const MANAUS_OFFSET_HOURS = -4;
  return new Date(date.getTime() + (MANAUS_OFFSET_HOURS * 60 * 60 * 1000));
}

async function main() {
  console.log('🔍 Verificando conversão de horários na agenda...\n');
  
  const appointment = await prisma.appointment.findFirst({
    where: {
      barber: {
        name: {
          contains: 'jhon',
          mode: 'insensitive'
        }
      },
      date: new Date('2026-01-08T23:00:00.000Z')
    },
    include: {
      client: true,
      barber: true
    }
  });
  
  if (!appointment) {
    console.log('❌ Agendamento não encontrado');
    return;
  }
  
  console.log('📅 Agendamento encontrado:');
  console.log(`Cliente: ${appointment.client.name}`);
  console.log(`Barbeiro: ${appointment.barber.name}`);
  console.log(`\n🕐 Data no banco (UTC): ${appointment.date.toISOString()}`);
  
  // Simular a conversão que a agenda faz
  const manausDate = toManausTime(new Date(appointment.date));
  
  console.log(`\n🌎 Após toManausTime():`);
  console.log(`  ISO: ${manausDate.toISOString()}`);
  console.log(`  getUTCHours(): ${manausDate.getUTCHours()}:${String(manausDate.getUTCMinutes()).padStart(2, '0')}`);
  
  // Simular o format do date-fns
  const { format } = require('date-fns');
  const formattedTime = format(manausDate, 'HH:mm');
  const formattedDate = format(manausDate, 'yyyy-MM-dd');
  
  console.log(`\n📊 Format (date-fns):`);
  console.log(`  Data: ${formattedDate}`);
  console.log(`  Hora: ${formattedTime}`);
  
  console.log(`\n✅ ESPERADO na agenda: 19:00`);
  console.log(`❓ O que você vê na tela: 15:00`);
  console.log(`\n📍 Diferença de 4 horas sugere que a agenda está mostrando o horário UTC diretamente sem converter!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
