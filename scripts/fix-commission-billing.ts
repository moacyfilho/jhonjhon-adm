/**
 * Script: fix-commission-billing.ts
 * Corrige totalAmount e Commission.amount de agendamentos de assinantes.
 * Uso:
 *   npx ts-node --skip-project scripts/fix-commission-billing.ts          (dry run)
 *   npx ts-node --skip-project scripts/fix-commission-billing.ts --apply  (aplica)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = !process.argv.includes('--apply');

async function main() {
  console.log(`\n=== fix-commission-billing [${dryRun ? 'DRY RUN' : 'APPLY'}] ===\n`);

  const appointments = await prisma.appointment.findMany({
    where: {
      isSubscriptionAppointment: true,
      status: { not: 'CANCELLED' },
    },
    include: {
      services: { include: { service: true } },
      products: true,
      client: true,
      barber: true,
      commission: true,
    },
  });

  console.log(`Total de agendamentos de assinantes: ${appointments.length}\n`);

  let fixedTotal = 0;
  let fixedCommission = 0;
  let alreadyCorrect = 0;
  let skipped = 0;

  for (const appt of appointments) {
    const activeSubscription = await prisma.subscription.findFirst({
      where: { clientId: appt.clientId, status: 'ACTIVE' },
    });

    if (!activeSubscription) {
      skipped++;
      continue;
    }

    // Parsear serviços incluídos no plano
    const servicesIncludedStr = activeSubscription.servicesIncluded || '';
    let includedServices: string[] = [];

    if (servicesIncludedStr) {
      try {
        const parsed = JSON.parse(servicesIncludedStr);
        if (parsed?.services && Array.isArray(parsed.services)) {
          includedServices = parsed.services.map((s: string) => s.trim().toLowerCase());
        }
      } catch {
        includedServices = servicesIncludedStr
          .split(/[,+]/)
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => s.length > 0);
      }
    }

    const productsTotal = appt.products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);

    let correctServicesTotal = 0;
    for (const apptService of appt.services) {
      const serviceName = apptService.service.name.toLowerCase();
      let isIncluded: boolean;

      if (includedServices.length === 0) {
        isIncluded = serviceName.includes('corte');
      } else {
        isIncluded = includedServices.some(
          (inc) => serviceName.includes(inc) || inc.includes(serviceName) || inc === apptService.serviceId
        );
      }

      if (!isIncluded) correctServicesTotal += apptService.price;
    }

    const correctTotal = correctServicesTotal + productsTotal;
    const needsTotalFix = Math.abs(correctTotal - appt.totalAmount) > 0.01;

    // Comissão correta: workedHoursSubscription × hourlyRate
    const correctCommission = appt.workedHoursSubscription * ((appt.barber as any)?.hourlyRate || 0);
    const currentCommission = (appt.commission as any)?.amount ?? null;
    const needsCommissionFix =
      appt.commission &&
      currentCommission !== null &&
      Math.abs(correctCommission - currentCommission) > 0.01 &&
      appt.workedHoursSubscription > 0;

    if (!needsTotalFix && !needsCommissionFix) {
      alreadyCorrect++;
      continue;
    }

    const clientName = (appt.client as any)?.name || appt.clientId;
    const dateStr = appt.date.toLocaleDateString('pt-BR');

    if (needsTotalFix) {
      console.log(
        `[TOTAL]  ${clientName} | ${dateStr} | R$${appt.totalAmount.toFixed(2)} → R$${correctTotal.toFixed(2)}`
      );
      if (!dryRun) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { totalAmount: correctTotal },
        });
        fixedTotal++;
      } else {
        fixedTotal++;
      }
    }

    if (needsCommissionFix) {
      console.log(
        `[COMISS] ${clientName} | ${dateStr} | R$${currentCommission!.toFixed(2)} → R$${correctCommission.toFixed(2)}`
      );
      if (!dryRun) {
        await prisma.commission.update({
          where: { appointmentId: appt.id },
          data: { amount: correctCommission },
        });
        fixedCommission++;
      } else {
        fixedCommission++;
      }
    }
  }

  console.log('\n=== RESUMO ===');
  console.log(`Já corretos:       ${alreadyCorrect}`);
  console.log(`Total corrigido:   ${fixedTotal}${dryRun ? ' (simulação)' : ''}`);
  console.log(`Comissão corrigida: ${fixedCommission}${dryRun ? ' (simulação)' : ''}`);
  console.log(`Sem assinatura:    ${skipped}`);
  if (dryRun) {
    console.log('\n⚠️  DRY RUN — nenhuma alteração foi salva.');
    console.log('Para aplicar: npx ts-node --skip-project scripts/fix-commission-billing.ts --apply');
  } else {
    console.log('\n✅ Correções aplicadas.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
