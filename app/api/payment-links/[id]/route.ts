import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Buscar link de pagamento por ID
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

    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id: params.id },
      include: {
        accountReceivable: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Link de pagamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentLink);
  } catch (error) {
    console.error('Erro ao buscar link de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar link de pagamento' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar link de pagamento (marcar como enviado, pago, etc.)
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
    const { status, sentAt, observations } = body;

    const existingLink = await prisma.paymentLink.findUnique({
      where: { id: params.id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link de pagamento não encontrado' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (sentAt !== undefined) updateData.sentAt = sentAt ? new Date(sentAt) : new Date();
    if (observations !== undefined) updateData.observations = observations;

    const paymentLink = await prisma.paymentLink.update({
      where: { id: params.id },
      data: updateData,
      include: {
        accountReceivable: {
          include: {
            client: true,
          },
        },
      },
    });

    return NextResponse.json(paymentLink);
  } catch (error) {
    console.error('Erro ao atualizar link de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar link de pagamento' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir link de pagamento
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

    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id: params.id },
    });

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Link de pagamento não encontrado' },
        { status: 404 }
      );
    }

    await prisma.paymentLink.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Link de pagamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir link de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir link de pagamento' },
      { status: 500 }
    );
  }
}
