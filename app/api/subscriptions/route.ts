import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { asaas } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

// GET - Listar assinaturas
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        client: true,
        plan: true,
        usageHistory: {
          orderBy: { usedDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar assinaturas' },
      { status: 500 }
    );
  }
}

// POST - Criar assinatura
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      planId,
      planName,
      amount,
      billingDay,
      servicesIncluded,
      usageLimit,
      observations,
    } = body;

    // Validações
    if (!clientId || !planName || !amount || !billingDay) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientId, planName, amount, billingDay' },
        { status: 400 }
      );
    }

    if (billingDay < 1 || billingDay > 31) {
      return NextResponse.json(
        { error: 'Dia de cobrança deve estar entre 1 e 31' },
        { status: 400 }
      );
    }

    // Verificar se o cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe assinatura ativa para este cliente
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        clientId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Cliente já possui uma assinatura ativa' },
        { status: 400 }
      );
    }

    // Calcular próxima data de vencimento baseada no billingDay
    const calculateNextDueDate = (billingDay: number): Date => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Se o billingDay já passou neste mês, usar próximo mês
      let targetMonth = currentDay >= billingDay ? currentMonth + 1 : currentMonth;
      let targetYear = currentYear;

      // Ajustar ano se passar de dezembro
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }

      // Ajustar dia para meses com menos dias
      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const adjustedDay = Math.min(billingDay, lastDayOfMonth);

      return new Date(targetYear, targetMonth, adjustedDay);
    };

    const nextDueDate = calculateNextDueDate(billingDay);

    let asaasSubscriptionId: string | null = null;

    // Integração Asaas (se configurado)
    if (process.env.ASAAS_API_KEY) {
      try {
        // 1. Garantir Cliente no Asaas
        let asaasCustomerId = client.asaasCustomerId;
        if (!asaasCustomerId) {
          const asaasCustomer = await asaas.createCustomer({
            name: client.name,
            phone: client.phone,
            mobilePhone: client.phone,
            externalReference: client.id
          });
          asaasCustomerId = asaasCustomer.id;
          // Atualizar cliente localmente
          await prisma.client.update({
            where: { id: client.id },
            data: { asaasCustomerId }
          });
        }

        // 2. Criar Assinatura no Asaas
        // Formatar data para YYYY-MM-DD
        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

        const asaasSub = await asaas.createSubscription({
          customer: asaasCustomerId!,
          billingType: 'PIX', // Default to PIX for now, can be parameterized
          value: parseFloat(amount),
          nextDueDate: nextDueDateStr,
          cycle: 'MONTHLY',
          description: `Assinatura ${planName}`
        });

        asaasSubscriptionId = asaasSub.id;

      } catch (error) {
        console.error('Erro na integração Asaas:', error);
        // Opcional: Retornar erro ou continuar apenas localmente?
        // Vamos retornar erro para garantir integridade se o usuário espera integração
        return NextResponse.json(
          { error: 'Erro ao criar assinatura no Asaas: ' + (error as Error).message },
          { status: 500 }
        );
      }
    }

    // Criar assinatura e conta a receber em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar assinatura
      const subscription = await tx.subscription.create({
        data: {
          clientId,
          planId: planId === 'custom' ? null : planId,
          planName,
          amount,
          billingDay,
          servicesIncluded,
          usageLimit: usageLimit || null,
          observations,
          asaasSubscriptionId, // Salvar ID do Asaas
        },
        include: {
          client: true,
        },
      });

      // Criar conta a receber automaticamente
      const accountReceivable = await tx.accountReceivable.create({
        data: {
          description: `${planName}`,
          category: 'SUBSCRIPTION',
          payer: client.name,
          clientId: clientId,
          phone: client.phone,
          amount: amount,
          dueDate: nextDueDate,
          status: 'PENDING',
          observations: `Criado automaticamente para assinatura: ${planName}`,
          subscriptionId: subscription.id,
        },
      });

      return { subscription, accountReceivable };
    });

    return NextResponse.json(result.subscription, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao criar assinatura' },
      { status: 500 }
    );
  }
}
