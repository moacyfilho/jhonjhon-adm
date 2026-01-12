
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, price, paymentLink, servicesIncluded } = body;

        const plan = await prisma.plan.create({
            data: {
                name,
                price: parseFloat(price),
                paymentLink,
                servicesIncluded, // Expected string or JSON
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Error creating plan:', error);
        return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
    }
}
