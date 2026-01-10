import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Buscar assinatura por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        usageHistory: {
          orderBy: { usedDate: 'desc' },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar assinatura' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar assinatura
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      planName,
      amount,
      billingDay,
      status,
      servicesIncluded,
      usageLimit,
      observations,
      endDate,
    } = body;

    // Verificar se a assinatura existe
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id: params.id },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (planName !== undefined) updateData.planName = planName;
    if (amount !== undefined) updateData.amount = amount;
    if (billingDay !== undefined) {
      if (billingDay < 1 || billingDay > 31) {
        return NextResponse.json(
          { error: 'Dia de cobrança deve estar entre 1 e 31' },
          { status: 400 }
        );
      }
      updateData.billingDay = billingDay;
    }
    if (status !== undefined) updateData.status = status;
    if (servicesIncluded !== undefined) updateData.servicesIncluded = servicesIncluded;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
    if (observations !== undefined) updateData.observations = observations;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const subscription = await prisma.subscription.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar assinatura' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir assinatura
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    await prisma.subscription.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Assinatura excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir assinatura' },
      { status: 500 }
    );
  }
}
