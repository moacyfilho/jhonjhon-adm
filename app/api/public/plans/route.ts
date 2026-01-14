
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Fetching public plans...');
        const count = await prisma.plan.count();
        console.log('Total plans in DB:', count);

        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });

        console.log('Active plans found:', plans.length);

        if (plans.length === 0) {
            // Return metadata to help debugging in production
            return NextResponse.json({
                plans: [],
                debug: {
                    totalPlans: count,
                    message: "No active plans found. Please run seed script or check isActive flag."
                }
            });
        }

        return NextResponse.json(plans);
    } catch (error: any) {
        console.error('Error fetching public plans:', error);
        return NextResponse.json({
            error: 'Erro ao buscar planos',
            details: error.message
        }, { status: 500 });
    }
}
