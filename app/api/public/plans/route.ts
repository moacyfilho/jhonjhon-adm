import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });
        return NextResponse.json(plans);
    } catch (error) {
        console.error('Error fetching public plans:', error);
        return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 });
    }
}
