
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado. Faça login primeiro.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const confirm = searchParams.get('confirm');

        if (confirm !== 'true') {
            return NextResponse.json({
                error: 'Confirmação necessária.',
                message: 'Para limpar os dados, acesse esta URL com ?confirm=true ao final.'
            }, { status: 400 });
        }

        // Executar limpeza (Mesma lógica do script local)

        // 1. Delete Online Bookings
        await prisma.onlineBookingService.deleteMany({});
        await prisma.onlineBooking.deleteMany({});

        // 2. Delete Appointments and related
        await prisma.commission.deleteMany({});
        await prisma.appointmentProduct.deleteMany({});
        await prisma.appointmentService.deleteMany({});
        await prisma.appointment.deleteMany({});

        // 3. Delete Subscriptions and Usage
        await prisma.subscriptionUsage.deleteMany({});

        // 4. Delete AccountReceivables linked to Clients/Subs
        await prisma.accountReceivable.deleteMany({
            where: {
                OR: [
                    { clientId: { not: null } },
                    { subscriptionId: { not: null } }
                ]
            }
        });

        // Subscriptions
        await prisma.subscription.deleteMany({});

        // 5. Delete Clients
        await prisma.client.deleteMany({});

        return NextResponse.json({
            success: true,
            message: 'Todos os atendimentos, assinaturas e clientes foram excluídos com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao limpar dados:', error);
        return NextResponse.json({ error: 'Erro interno ao tentar limpar dados.' }, { status: 500 });
    }
}
