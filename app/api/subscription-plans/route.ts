import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar todos os planos
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { subscriptions: true }
                }
            }
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error('Erro ao buscar planos:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar planos' },
            { status: 500 }
        );
    }
}

// POST - Criar novo plano
export async function POST(request: NextRequest) {
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

        const plan = await prisma.subscriptionPlan.create({
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

        return NextResponse.json(plan, { status: 201 });
    } catch (error) {
        console.error('Erro ao criar plano:', error);
        return NextResponse.json(
            { error: 'Erro ao criar plano' },
            { status: 500 }
        );
    }
}
