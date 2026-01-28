import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Buscar plano por ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { subscriptions: true }
                }
            }
        });

        if (!plan) {
            return NextResponse.json(
                { error: 'Plano não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Erro ao buscar plano:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar plano' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar plano
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
        const { name, description, price, durationDays, servicesIncluded, usageLimit, isActive } = body;

        if (!name || !price || !durationDays) {
            return NextResponse.json(
                { error: 'Nome, preço e duração são obrigatórios' },
                { status: 400 }
            );
        }

        const plan = await prisma.subscriptionPlan.update({
            where: { id: params.id },
            data: {
                name,
                description: description || null,
                price: parseFloat(price),
                durationDays: parseInt(durationDays),
                servicesIncluded: servicesIncluded || null,
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Erro ao atualizar plano:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar plano' },
            { status: 500 }
        );
    }
}

// DELETE - Deletar plano
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verificar se há assinaturas ativas usando este plano
        const subscriptionsCount = await prisma.subscription.count({
            where: {
                planId: params.id,
                status: 'ACTIVE'
            }
        });

        if (subscriptionsCount > 0) {
            return NextResponse.json(
                { error: `Não é possível deletar. Existem ${subscriptionsCount} assinatura(s) ativa(s) usando este plano.` },
                { status: 400 }
            );
        }

        await prisma.subscriptionPlan.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Plano excluído com sucesso' });
    } catch (error: any) {
        console.error('Erro ao deletar plano:', error);
        return NextResponse.json(
            {
                error: 'Erro ao excluir plano',
                details: error?.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}
