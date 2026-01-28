import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET - Relatório financeiro consolidado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // dias

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    startDate.setHours(0, 0, 0, 0);

    // Incluir contas futuras até +30 dias para capturar pendências
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

    // Buscar contas a pagar
    const accountsPayable = await prisma.accountPayable.findMany({
      where: {
        OR: [
          {
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
    });

    // Buscar contas a receber
    const accountsReceivable = await prisma.accountReceivable.findMany({
      where: {
        OR: [
          {
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
    });

    console.log('Relatório Financeiro:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      accountsPayableCount: accountsPayable.length,
      accountsReceivableCount: accountsReceivable.length,
    });

    // Calcular totais
    const totalPayable = accountsPayable.reduce((sum: any, acc: any) => sum + acc.amount, 0);
    const totalReceivable = accountsReceivable.reduce((sum: any, acc: any) => sum + acc.amount, 0);
    
    const totalPayablePaid = accountsPayable
      .filter((acc: any) => acc.status === 'PAID')
      .reduce((sum: any, acc: any) => sum + acc.amount, 0);
    
    const totalReceivablePaid = accountsReceivable
      .filter((acc: any) => acc.status === 'PAID')
      .reduce((sum: any, acc: any) => sum + acc.amount, 0);
    
    const totalPayablePending = accountsPayable
      .filter((acc: any) => acc.status === 'PENDING' || acc.status === 'OVERDUE')
      .reduce((sum: any, acc: any) => sum + acc.amount, 0);
    
    const totalReceivablePending = accountsReceivable
      .filter((acc: any) => acc.status === 'PENDING' || acc.status === 'OVERDUE')
      .reduce((sum: any, acc: any) => sum + acc.amount, 0);

    // Agrupar por categoria (Contas a Pagar)
    const payableByCategory: Record<string, number> = {};
    accountsPayable.forEach((acc: any) => {
      if (!payableByCategory[acc.category]) {
        payableByCategory[acc.category] = 0;
      }
      payableByCategory[acc.category] += acc.amount;
    });

    // Agrupar por categoria (Contas a Receber)
    const receivableByCategory: Record<string, number> = {};
    accountsReceivable.forEach((acc: any) => {
      if (!receivableByCategory[acc.category]) {
        receivableByCategory[acc.category] = 0;
      }
      receivableByCategory[acc.category] += acc.amount;
    });

    // Fluxo de caixa diário (7 dias)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayReceivable = accountsReceivable
        .filter(
          (acc: any) =>
            acc.paymentDate &&
            new Date(acc.paymentDate) >= date &&
            new Date(acc.paymentDate) < nextDate &&
            acc.status === 'PAID'
        )
        .reduce((sum: any, acc: any) => sum + acc.amount, 0);

      const dayPayable = accountsPayable
        .filter(
          (acc: any) =>
            acc.paymentDate &&
            new Date(acc.paymentDate) >= date &&
            new Date(acc.paymentDate) < nextDate &&
            acc.status === 'PAID'
        )
        .reduce((sum: any, acc: any) => sum + acc.amount, 0);

      last7Days.push({
        date: format(date, 'dd/MM'),
        receivable: dayReceivable,
        payable: dayPayable,
        balance: dayReceivable - dayPayable,
      });
    }

    // Status das contas (para gráfico de pizza)
    const payableStatus = {
      paid: accountsPayable.filter((acc: any) => acc.status === 'PAID').length,
      pending: accountsPayable.filter((acc: any) => acc.status === 'PENDING').length,
      overdue: accountsPayable.filter((acc: any) => acc.status === 'OVERDUE').length,
    };

    const receivableStatus = {
      paid: accountsReceivable.filter((acc: any) => acc.status === 'PAID').length,
      pending: accountsReceivable.filter((acc: any) => acc.status === 'PENDING').length,
      overdue: accountsReceivable.filter((acc: any) => acc.status === 'OVERDUE').length,
    };

    return NextResponse.json({
      summary: {
        totalPayable,
        totalReceivable,
        totalPayablePaid,
        totalReceivablePaid,
        totalPayablePending,
        totalReceivablePending,
        balance: totalReceivablePaid - totalPayablePaid,
        projectedBalance: totalReceivable - totalPayable,
      },
      payableByCategory,
      receivableByCategory,
      cashFlow: last7Days,
      payableStatus,
      receivableStatus,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório financeiro' },
      { status: 500 }
    );
  }
}