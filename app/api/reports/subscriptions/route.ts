import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dateParam = searchParams.get('date'); // YYYY-MM-DD

        // Determine date range (default to current month)
        const referenceDate = dateParam ? parseISO(dateParam) : new Date();
        const startDate = startOfMonth(referenceDate);
        const endDate = endOfMonth(referenceDate);

        // 1. Calculate Financials (Recebidas / A Receber)
        // Recebidas: Somar pelo paymentDate (quando caiu o dinheiro)
        const receivedData = await prisma.accountReceivable.aggregate({
            _sum: { amount: true },
            where: {
                category: 'SUBSCRIPTION',
                status: 'PAID',
                paymentDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // A receber: Somar pelo dueDate (o que vence/venceu no mês)
        const pendingData = await prisma.accountReceivable.aggregate({
            _sum: { amount: true },
            where: {
                category: 'SUBSCRIPTION',
                status: { in: ['PENDING', 'OVERDUE'] },
                dueDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const receivedAmount = receivedData._sum.amount || 0;
        const pendingAmount = pendingData._sum.amount || 0;

        // Note: If no receivables exist, we might want to fallback to active subscriptions sum, 
        // but proper system usage implies generating receivables. 
        // For now, let's also fetch active subscriptions count as a sanity check or "Total Potential".

        // 2. Fetch Subscription Appointments
        const appointments = await prisma.appointment.findMany({
            where: {
                isSubscriptionAppointment: true,
                status: 'COMPLETED',
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                barber: true,
                services: {
                    include: {
                        service: true
                    }
                },
            },
        });

        // 3. Calculate Global Metrics
        // Calculate total hours from appointments (using workedHoursSubscription)
        let totalServiceMinutes = 0;

        const processedAppointments = appointments.map(app => {
            // Se workedHoursSubscription estiver zerado (legado), calcular pela duração dos serviços
            let durationMinutes = app.workedHoursSubscription * 60;
            if (durationMinutes === 0) {
                durationMinutes = app.services.reduce((acc, s) => acc + s.service.duration, 0);
            }
            totalServiceMinutes += durationMinutes;

            return {
                ...app,
                durationMinutes
            };
        });

        const totalServiceHours = totalServiceMinutes / 60;

        // VALOR DA HORA (DINÂMICO): Total Recebido / Total de Horas de Assinantes Trabalhadas
        const hourlyRate = totalServiceHours > 0
            ? receivedAmount / totalServiceHours
            : 0;

        // Total (Recebidas + A receber)
        const grandTotal = receivedAmount + pendingAmount;

        // Frequência (Atendimentos Totais / Total de Assinantes que usaram ou total de ativos?)
        // Na imagem parece ser a média de uso por assinante
        const subscriptionsCount = await prisma.subscription.count({
            where: { status: 'ACTIVE' }
        });

        const totalUsageCount = processedAppointments.length;
        const averageFrequency = subscriptionsCount > 0
            ? totalUsageCount / subscriptionsCount
            : 0;

        // 4. Build Detailed Subscriber List
        // Buscar todas as contas a receber do período para saber quem pagou
        const monthlyReceivables = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION',
                OR: [
                    { paymentDate: { gte: startDate, lte: endDate } },
                    { dueDate: { gte: startDate, lte: endDate } }
                ]
            }
        });

        // Buscar todos os assinantes ativos para listar
        const allSubscriptions = await prisma.subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { client: true }
        });

        const subscriberList = allSubscriptions.map(sub => {
            // Ver se tem conta paga ou pendente este mês
            const receivable = monthlyReceivables.find(r => r.clientId === sub.clientId);

            // Ver uso deste assinante no mês
            const usage = processedAppointments.filter(app => app.clientId === sub.clientId);
            const usageCount = usage.length;
            const usageMinutes = usage.reduce((acc, app) => acc + app.durationMinutes, 0);

            return {
                id: sub.id,
                clientName: sub.client.name,
                clientPhone: sub.client.phone,
                amount: sub.amount,
                billingDay: sub.billingDay,
                isPaid: receivable?.status === 'PAID',
                usageCount,
                usageMinutes
            };
        });

        // 5. Build Barber Table Data
        const barberStats: Record<string, any> = {};
        const serviceNames = new Set<string>();

        processedAppointments.forEach(app => {
            const barberId = app.barberId;
            const barberName = app.barber.name;
            const commissionRate = app.barber.commissionRate;

            if (!barberStats[barberId]) {
                barberStats[barberId] = {
                    id: barberId,
                    name: barberName,
                    commissionRate,
                    totalMinutes: 0,
                    services: {}
                };
            }

            app.services.forEach(appService => {
                const serviceName = appService.service.name;
                serviceNames.add(serviceName);

                if (!barberStats[barberId].services[serviceName]) {
                    barberStats[barberId].services[serviceName] = {
                        count: 0,
                        minutes: 0
                    };
                }

                barberStats[barberId].services[serviceName].count += 1;
                barberStats[barberId].services[serviceName].minutes += appService.service.duration;
                barberStats[barberId].totalMinutes += appService.service.duration;
            });
        });

        // Format for response
        const barbers = Object.values(barberStats).map(b => {
            const totalHours = b.totalMinutes / 60;
            const totalValue = totalHours * hourlyRate;
            const commission = (totalValue * b.commissionRate) / 100;

            return {
                name: b.name,
                services: b.services,
                totalHours,
                totalValue,
                commission,
                house: totalValue - commission
            };
        });

        barbers.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            metrics: {
                received: receivedAmount,
                pending: pendingAmount,
                total: grandTotal,
                totalHours: totalServiceHours,
                hourlyRate: hourlyRate,
                frequency: averageFrequency
            },
            table: {
                serviceNames: Array.from(serviceNames).sort(),
                barbers
            },
            subscribers: subscriberList
        });

    } catch (error) {
        console.error('Error serving subscription report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
