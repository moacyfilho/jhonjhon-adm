
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { name, price, paymentLink, servicesIncluded, isActive } = body;

        const plan = await prisma.plan.update({
            where: { id: params.id },
            data: {
                name,
                price: price !== undefined ? parseFloat(price) : undefined,
                paymentLink,
                servicesIncluded,
                isActive,
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Error updating plan:', error);
        return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Check if used
        const usage = await prisma.subscription.count({
            where: { planId: params.id }
        });

        if (usage > 0) {
            // Soft delete
            await prisma.plan.update({
                where: { id: params.id },
                data: { isActive: false }
            });
        } else {
            // Hard delete
            await prisma.plan.delete({
                where: { id: params.id }
            });
        }

        return NextResponse.json({ message: 'Plano excluído/desativado' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        return NextResponse.json({ error: 'Erro ao excluir plano' }, { status: 500 });
    }
}
