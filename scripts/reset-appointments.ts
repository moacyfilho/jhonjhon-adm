import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpeza de agendamentos...');

  // Deletar todas as comissões primeiro (devido a foreign keys)
  const deletedCommissions = await prisma.commission.deleteMany({});
  console.log(`✅ ${deletedCommissions.count} comissões deletadas`);

  // Deletar todos os agendamentos online
  const deletedOnlineBookings = await prisma.onlineBooking.deleteMany({});
  console.log(`✅ ${deletedOnlineBookings.count} agendamentos online deletados`);

  // Deletar todos os agendamentos
  const deletedAppointments = await prisma.appointment.deleteMany({});
  console.log(`✅ ${deletedAppointments.count} agendamentos deletados`);

  // Deletar bloqueios de horários
  const deletedBlocks = await prisma.scheduleBlock.deleteMany({});
  console.log(`✅ ${deletedBlocks.count} bloqueios de horário deletados`);

  console.log('\n✨ Limpeza concluída com sucesso!');
  console.log('\n📅 Agora você pode criar novos agendamentos para teste através da interface.');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
