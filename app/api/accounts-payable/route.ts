import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AccountStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Listar contas a pagar
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

    if (status && status !== 'all') {
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

    const accounts = await prisma.accountPayable.findMany({
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
      await prisma.accountPayable.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: AccountStatus.OVERDUE },
      });

      // Recarregar contas após atualização
      const updatedAccounts = await prisma.accountPayable.findMany({
        where,
        orderBy: { dueDate: 'asc' },
      });
      return NextResponse.json(updatedAccounts);
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error);
    return NextResponse.json({ error: 'Erro ao buscar contas a pagar' }, { status: 500 });
  }
}

// POST - Criar nova conta a pagar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { description, category, supplier, amount, dueDate, observations } = body;

    if (!description || !category || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: descrição, categoria, valor e data de vencimento' },
        { status: 400 }
      );
    }

    const account = await prisma.accountPayable.create({
      data: {
        description,
        category,
        supplier: supplier || null,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        observations: observations || null,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error);
    return NextResponse.json({ error: 'Erro ao criar conta a pagar' }, { status: 500 });
  }
}