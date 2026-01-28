import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT - Atualizar conta a pagar
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { description, category, supplier, amount, dueDate, paymentDate, status, paymentMethod, observations } = body;

    const updateData: any = {};

    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (supplier !== undefined) updateData.supplier = supplier || null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (observations !== undefined) updateData.observations = observations || null;
    
    // Se estiver marcando como pago
    if (status === 'PAID') {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
    }

    const account = await prisma.accountPayable.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Erro ao atualizar conta a pagar:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conta a pagar' }, { status: 500 });
  }
}

// DELETE - Excluir conta a pagar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.accountPayable.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta a pagar:', error);
    return NextResponse.json({ error: 'Erro ao excluir conta a pagar' }, { status: 500 });
  }
}