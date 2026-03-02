import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar assinaturas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const type = searchParams.get('type') || 'standard';
    const isExclusiveMode = type === 'exclusive';

    const where: any = {
      isExclusive: isExclusiveMode
    };

    if (status && status !== 'all') {
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      planId,
      planName: manualPlanName,
      amount: manualAmount,
      billingDay,
      servicesIncluded: manualServices,
      usageLimit: manualLimit,
      observations,
    } = body;

    // Validações
    if (!clientId || (!planId && !manualPlanName) || (!planId && manualAmount === undefined) || !billingDay) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientId, (planId ou planName+amount), billingDay' },
        { status: 400 }
      );
    }

    // Se planId for fornecido, buscar os dados do plano
    let planName = manualPlanName;
    let amount = manualAmount;
    let servicesIncluded = manualServices;
    let usageLimit = manualLimit;

    // Determine exclusivity: start with body value, but plan can force it to true
    let isExclusiveValue = !!(body as any).isExclusive;

    if (planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      });
      if (!plan) {
        return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
      }
      planName = plan.name;
      amount = plan.price;
      servicesIncluded = plan.servicesIncluded;
      usageLimit = plan.usageLimit;

      // Inherit exclusivity from plan
      if ((plan as any).isExclusive) {
        isExclusiveValue = true;
      }
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

    // Ao criar assinatura, o AR deve ser sempre do mês atual (o próximo mês será
    // criado automaticamente quando este for pago via recorrência).
    const calculateCurrentMonthDueDate = (billingDay: number): Date => {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();

      // Ajustar dia para meses com menos dias (ex: billingDay=31 em fevereiro → 28)
      const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const adjustedDay = Math.min(billingDay, lastDayOfMonth);

      return new Date(Date.UTC(currentYear, currentMonth, adjustedDay, 12, 0, 0));
    };

    const nextDueDate = calculateCurrentMonthDueDate(billingDay);

    console.log('[CREATE SUBSCRIPTION] Final isExclusive value:', isExclusiveValue);

    // Criar assinatura e conta a receber em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar assinatura
      const subscription = await tx.subscription.create({
        data: {
          clientId,
          planId: planId || null,
          planName: planName as string,
          amount: parseFloat(amount as string),
          billingDay: parseInt(billingDay as string),
          servicesIncluded: servicesIncluded || null,
          usageLimit: usageLimit ? parseInt(usageLimit as string) : null,
          observations,
          isExclusive: isExclusiveValue,
        } as any,
        include: {
          client: true,
          plan: true,
        },
      });

      // Criar conta a receber automaticamente (mês atual)
      const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      const arMonth = monthNames[nextDueDate.getUTCMonth()];
      const arYear = nextDueDate.getUTCFullYear();

      const accountReceivable = await tx.accountReceivable.create({
        data: {
          description: `Assinatura - ${planName} - ${arMonth} de ${arYear}`,
          category: 'SUBSCRIPTION',
          payer: client.name,
          clientId: clientId,
          phone: client.phone,
          amount: amount,
          dueDate: nextDueDate,
          status: 'PENDING',
          subscriptionId: subscription.id,
          observations: `Criado automaticamente para assinatura: ${planName}`,
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
