import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Gerar link de pagamento
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { accountReceivableId, expiryDays } = body;

    if (!accountReceivableId) {
      return NextResponse.json(
        { error: 'accountReceivableId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a conta existe
    const account = await prisma.accountReceivable.findUnique({
      where: { id: accountReceivableId },
      include: { client: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Conta a receber não encontrada' },
        { status: 404 }
      );
    }

    // Gerar URL de pagamento (aqui você pode integrar com sua plataforma de pagamento)
    // Por enquanto, vamos gerar um link simulado
    const linkId = Math.random().toString(36).substring(2, 15);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://jhonjhon-adm.abacusai.app';
    const linkUrl = `${baseUrl}/pagamento/${linkId}`;

    // Calcular data de expiração
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null;

    const paymentLink = await prisma.paymentLink.create({
      data: {
        accountReceivableId,
        linkUrl,
        generatedBy: user.id || 'system',
        expiresAt,
        status: 'generated',
      },
      include: {
        accountReceivable: {
          include: {
            client: true,
          },
        },
      },
    });

    return NextResponse.json(paymentLink, { status: 201 });
  } catch (error) {
    console.error('Erro ao gerar link de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar link de pagamento' },
      { status: 500 }
    );
  }
}

// GET - Listar links de pagamento
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountReceivableId = searchParams.get('accountReceivableId');
    const status = searchParams.get('status');

    const where: any = {};
    if (accountReceivableId) where.accountReceivableId = accountReceivableId;
    if (status) where.status = status;

    const paymentLinks = await prisma.paymentLink.findMany({
      where,
      include: {
        accountReceivable: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(paymentLinks);
  } catch (error) {
    console.error('Erro ao buscar links de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar links de pagamento' },
      { status: 500 }
    );
  }
}
