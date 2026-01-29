import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AccountStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Listar contas a receber
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (startDate && endDate) {
      where.dueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const accounts = await prisma.accountReceivable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    // Atualizar status de contas vencidas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueIds = accounts
      .filter(acc => acc.status === 'PENDING' && new Date(acc.dueDate) < today)
      .map(acc => acc.id);

    if (overdueIds.length > 0) {
      await prisma.accountReceivable.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: AccountStatus.OVERDUE },
      });

      // Recarregar contas após atualização
      const updatedAccounts = await prisma.accountReceivable.findMany({
        where,
        orderBy: { dueDate: 'asc' },
      });
      return NextResponse.json(updatedAccounts);
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Erro ao buscar contas a receber:', error);
    return NextResponse.json({ error: 'Erro ao buscar contas a receber' }, { status: 500 });
  }
}

// POST - Criar nova conta a receber
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { description, category, payer, amount, dueDate, observations, clientId, subscriptionId } = body;

    if (!description || !category || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: descrição, categoria, valor e data de vencimento' },
        { status: 400 }
      );
    }

    const account = await prisma.accountReceivable.create({
      data: {
        description,
        category,
        payer: payer || null,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        observations: observations || null,
        clientId: clientId || null,
        subscriptionId: subscriptionId || null,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error);
    return NextResponse.json({ error: 'Erro ao criar conta a receber' }, { status: 500 });
  }
}