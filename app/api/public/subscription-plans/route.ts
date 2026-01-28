import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar planos ativos disponíveis para contratação pública
export async function GET() {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: {
                isActive: true,
            },
            orderBy: { price: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                durationDays: true,
                servicesIncluded: true,
                usageLimit: true,
            },
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
