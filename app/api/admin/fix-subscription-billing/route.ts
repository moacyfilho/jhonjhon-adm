import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/fix-subscription-billing
 * Corrige o totalAmount de agendamentos de assinantes que foram incorretamente cobrados
 * por serviços que estão incluídos no plano (ex: Corte & Barba cobrado = R$35 indevido).
 *
 * Query params:
 *   dryRun=true  → apenas simula, não salva (padrão: false)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') !== 'false';

  // Busca todos os agendamentos de assinantes não cancelados
  const appointments = await prisma.appointment.findMany({
    where: {
      isSubscriptionAppointment: true,
      status: { not: 'CANCELLED' },
    },
    include: {
      services: {
        include: { service: true },
      },
      products: true,
      client: true,
    },
  });

  const results: {
    appointmentId: string;
    clientName: string;
    date: string;
    totalBefore: number;
    totalAfter: number;
    fixed: boolean;
    reason: string;
  }[] = [];

  for (const appt of appointments) {
    // Busca assinatura ativa do cliente
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        clientId: appt.clientId,
        status: 'ACTIVE',
      },
    });

    if (!activeSubscription) {
      results.push({
        appointmentId: appt.id,
        clientName: appt.client?.name || appt.clientId,
        date: appt.date.toISOString(),
        totalBefore: appt.totalAmount,
        totalAfter: appt.totalAmount,
        fixed: false,
        reason: 'Sem assinatura ativa',
      });
      continue;
    }

    // Parseia os serviços incluídos no plano (mesma lógica do PATCH)
    const servicesIncludedStr = activeSubscription.servicesIncluded || '';
    let includedServices: string[] = [];

    if (servicesIncludedStr) {
      try {
        const parsed = JSON.parse(servicesIncludedStr);
        if (parsed.services && Array.isArray(parsed.services)) {
          includedServices = parsed.services.map((s: string) => s.trim().toLowerCase());
        }
      } catch {
        // Legado: lista separada por vírgula ou '+'
        includedServices = servicesIncludedStr
          .split(/[,+]/)
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => s.length > 0);
      }
    }

    // Calcula o total correto de produtos
    const productsTotal = appt.products.reduce(
      (sum, p) => sum + p.unitPrice * p.quantity,
      0
    );

    // Calcula o total correto de serviços (excluindo os incluídos no plano)
    let correctServicesTotal = 0;
    for (const apptService of appt.services) {
      const serviceName = apptService.service.name.toLowerCase();
      let isIncluded: boolean;

      if (includedServices.length === 0) {
        // Padrão: apenas corte é isento
        isIncluded = serviceName.includes('corte');
      } else {
        isIncluded = includedServices.some(
          (inc) => serviceName.includes(inc) || inc === apptService.serviceId
        );
      }

      if (!isIncluded) {
        correctServicesTotal += apptService.price;
      }
    }

    const correctTotal = correctServicesTotal + productsTotal;
    const needsFix = Math.abs(correctTotal - appt.totalAmount) > 0.01;

    if (needsFix && !dryRun) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { totalAmount: correctTotal },
      });
    }

    results.push({
      appointmentId: appt.id,
      clientName: appt.client?.name || appt.clientId,
      date: appt.date.toISOString(),
      totalBefore: appt.totalAmount,
      totalAfter: correctTotal,
      fixed: needsFix,
      reason: needsFix
        ? `Corrigido: R$${appt.totalAmount.toFixed(2)} → R$${correctTotal.toFixed(2)} (plano inclui: ${includedServices.join(', ') || 'corte'})`
        : 'Já correto',
    });
  }

  const fixed = results.filter((r) => r.fixed);
  const alreadyCorrect = results.filter((r) => !r.fixed && r.reason === 'Já correto');
  const skipped = results.filter((r) => !r.fixed && r.reason !== 'Já correto');

  return NextResponse.json({
    dryRun,
    summary: {
      total: results.length,
      fixed: fixed.length,
      alreadyCorrect: alreadyCorrect.length,
      skipped: skipped.length,
    },
    corrections: fixed,
    skipped,
  });
}
