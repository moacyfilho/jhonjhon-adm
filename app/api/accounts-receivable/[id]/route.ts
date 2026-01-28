import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT - Atualizar conta a receber
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
    const { description, category, payer, amount, dueDate, paymentDate, status, paymentMethod, observations } = body;

    const updateData: any = {};

    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (payer !== undefined) updateData.payer = payer || null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (observations !== undefined) updateData.observations = observations || null;
    
    // Se estiver marcando como recebido
    if (status === 'PAID') {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
    }

    // Buscar conta antes de atualizar para verificar se é assinatura
    const existingAccount = await prisma.accountReceivable.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
      },
    });

    const account = await prisma.accountReceivable.update({
      where: { id: params.id },
      data: updateData,
    });

    // 🔄 RECORRÊNCIA AUTOMÁTICA: Se for assinatura e foi marcada como paga
    if (
      existingAccount && 
      existingAccount.category === 'SUBSCRIPTION' && 
      status === 'PAID' && 
      existingAccount.subscriptionId
    ) {
      try {
        console.log(`🔄 Criando recorrência para assinatura ${existingAccount.subscriptionId}...`);
        
        const subscription = existingAccount.subscription;
        
        if (subscription && subscription.status === 'ACTIVE') {
          // Calcular próxima data de vencimento (próximo mês, mesmo dia)
          const currentDueDate = new Date(existingAccount.dueDate);
          const nextDueDate = new Date(currentDueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          
          // Ajustar se o dia não existir no próximo mês (ex: 31 de fevereiro -> 28/29 de fevereiro)
          if (nextDueDate.getDate() !== currentDueDate.getDate()) {
            nextDueDate.setDate(0); // Vai para o último dia do mês anterior
          }

          // Criar nova conta a receber para o próximo mês
          const newAccount = await prisma.accountReceivable.create({
            data: {
              description: `${subscription.planName} - ${nextDueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
              category: 'SUBSCRIPTION',
              payer: existingAccount.payer,
              clientId: subscription.clientId,
              phone: existingAccount.phone,
              amount: subscription.amount,
              dueDate: nextDueDate,
              status: 'PENDING',
              subscriptionId: subscription.id,
              observations: 'Gerado automaticamente pela recorrência de assinatura',
            },
          });

          console.log(`✅ Nova cobrança criada: ${newAccount.id} com vencimento em ${nextDueDate.toLocaleDateString('pt-BR')}`);
        }
      } catch (recurrenceError) {
        console.error('❌ Erro ao criar recorrência:', recurrenceError);
        // Não falhar a atualização da conta atual por erro na recorrência
      }
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Erro ao atualizar conta a receber:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conta a receber' }, { status: 500 });
  }
}

// DELETE - Excluir conta a receber
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.accountReceivable.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conta a receber:', error);
    return NextResponse.json({ error: 'Erro ao excluir conta a receber' }, { status: 500 });
  }
}