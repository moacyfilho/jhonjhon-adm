import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Contratar plano de assinatura
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { planId, clientName, clientPhone, clientEmail } = body;

        if (!planId || !clientName || !clientPhone) {
            return NextResponse.json(
                { error: 'Plano, nome e telefone são obrigatórios' },
                { status: 400 }
            );
        }

        // Buscar o plano
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });

        if (!plan || !plan.isActive) {
            return NextResponse.json(
                { error: 'Plano não encontrado ou inativo' },
                { status: 404 }
            );
        }

        // Verificar se o cliente já existe
        let client = await prisma.client.findFirst({
            where: { phone: clientPhone },
        });

        // Se não existir, criar novo cliente
        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    phone: clientPhone,
                    email: clientEmail || null,
                },
            });
        }

        // Calcular data de início e fim
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Criar assinatura
        const subscription = await prisma.subscription.create({
            data: {
                clientId: client.id,
                planId: plan.id,
                planName: plan.name,
                amount: plan.price,
                billingDay: startDate.getDate(),
                status: 'ACTIVE',
                startDate,
                endDate,
                servicesIncluded: plan.servicesIncluded,
                usageLimit: plan.usageLimit,
                observations: 'Assinatura contratada via agendamento online',
            },
        });

        // Criar conta a receber para o primeiro pagamento
        await prisma.accountReceivable.create({
            data: {
                description: `Assinatura - ${plan.name}`,
                category: 'SUBSCRIPTION',
                payer: clientName,
                clientId: client.id,
                phone: clientPhone,
                amount: plan.price,
                dueDate: startDate,
                status: 'PENDING',
                subscriptionId: subscription.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Assinatura contratada com sucesso!',
            subscription: {
                id: subscription.id,
                planName: plan.name,
                amount: plan.price,
                startDate,
                endDate,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Erro ao contratar plano:', error);
        return NextResponse.json(
            { error: 'Erro ao contratar plano' },
            { status: 500 }
        );
    }
}
