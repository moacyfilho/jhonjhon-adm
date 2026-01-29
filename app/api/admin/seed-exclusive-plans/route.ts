
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        console.log('Seeding exclusive plans...');

        let ownerId = null;

        const jhon = await prisma.barber.findFirst({
            where: {
                name: { contains: 'Jhon', mode: 'insensitive' }
            }
        });

        if (jhon) {
            console.log(`Found Jhon Jhon (ID: ${jhon.id})`);
            ownerId = jhon.id;
        } else {
            console.log('Barber Jhon Jhon not found, creating plans without owner preference (or default).');
        }

        const plans = [
            {
                id: 'plan-exclusive-corte',
                name: 'Assinatura Exclusiva - Corte',
                description: 'Cortes ilimitados com Jhon Jhon (Exclusivo)',
                price: 99.90,
                durationDays: 30,
                servicesIncluded: JSON.stringify({ services: ['Corte'] }),
                isExclusive: true,
                ownerId: ownerId,
                isActive: true
            },
            {
                id: 'plan-exclusive-combo',
                name: 'Assinatura Exclusiva - Corte + Barba',
                description: 'Cortes e Barbaterapia ilimitados com Jhon Jhon (Exclusivo)',
                price: 199.90,
                durationDays: 30,
                servicesIncluded: JSON.stringify({ services: ['Corte', 'Barba'] }),
                isExclusive: true,
                ownerId: ownerId,
                isActive: true
            },
            {
                id: 'plan-exclusive-barba',
                name: 'Assinatura Exclusiva - Barba',
                description: 'Barbaterapia ilimitada com Jhon Jhon (Exclusivo)',
                price: 99.90,
                durationDays: 30,
                servicesIncluded: JSON.stringify({ services: ['Barba'] }),
                isExclusive: true,
                ownerId: ownerId,
                isActive: true
            }
        ];

        const results = [];

        for (const plan of plans) {
            const result = await prisma.subscriptionPlan.upsert({
                where: { id: plan.id },
                update: {
                    ...plan,
                    ownerId: ownerId, // Ensure owner is updated if Jhon Jhon ID changes
                    isExclusive: true,
                    isActive: true
                },
                create: plan
            });
            results.push(result);
        }

        return NextResponse.json({
            success: true,
            message: `Planos exclusivos recriados/atualizados com sucesso. (${results.length} planos)`,
            plans: results
        });

    } catch (error: any) {
        console.error('Erro ao seedar planos exclusivos:', error);
        return NextResponse.json(
            { error: 'Erro interno ao criar planos: ' + error.message },
            { status: 500 }
        );
    }
}
