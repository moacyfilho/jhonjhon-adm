import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ error: 'ID do cliente não informado' }, { status: 400 });
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                appointments: {
                    where: { status: 'COMPLETED' },
                    include: {
                        barber: true,
                        services: {
                            include: { service: true }
                        },
                        products: {
                            include: { product: true }
                        }
                    },
                    orderBy: { date: 'desc' }
                },
                subscriptions: {
                    include: { plan: true }
                }
            }
        });

        if (!client) {
            return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        // Calculate some stats
        const totalSpent = client.appointments.reduce((acc, app) => acc + app.totalAmount, 0);
        const totalServices = client.appointments.reduce((acc, app) => acc + app.services.length, 0);
        const totalProducts = client.appointments.reduce((acc, app) => acc + app.products.length, 0);

        const serviceCounts: Record<string, number> = {};
        client.appointments.forEach(app => {
            app.services.forEach(s => {
                serviceCounts[s.service.name] = (serviceCounts[s.service.name] || 0) + 1;
            });
        });
        const favoriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

        const barberCounts: Record<string, number> = {};
        client.appointments.forEach(app => {
            barberCounts[app.barber.name] = (barberCounts[app.barber.name] || 0) + 1;
        });
        const favoriteBarber = Object.entries(barberCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

        return NextResponse.json({
            client: {
                id: client.id,
                name: client.name,
                phone: client.phone,
                email: client.email,
                createdAt: client.createdAt,
            },
            stats: {
                totalSpent,
                totalServices,
                totalProducts,
                favoriteService,
                favoriteBarber,
                lastVisit: client.appointments[0]?.date || null,
                visitCount: client.appointments.length
            },
            appointments: client.appointments,
            subscriptions: client.subscriptions
        });
    } catch (error) {
        console.error('Erro ao gerar relatório do cliente:', error);
        return NextResponse.json(
            { error: 'Erro ao gerar relatório' },
            { status: 500 }
        );
    }
}
