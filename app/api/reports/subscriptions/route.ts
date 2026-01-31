import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, parseISO, subDays, addDays, isWithinInterval } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dateParam = searchParams.get('date'); // YYYY-MM-DD
        const type = searchParams.get('type') || 'standard'; // 'standard' | 'exclusive'
        const isExclusiveMode = type === 'exclusive';

        // Determine date range (default to current month)
        const referenceDate = dateParam ? parseISO(dateParam) : new Date();
        const startDate = startOfMonth(referenceDate);
        const endDate = endOfMonth(referenceDate);

        // Buffer dates to handle Timezone edge cases
        const startBuffer = subDays(startDate, 2);
        const endBuffer = addDays(endDate, 2);

        // 1. Fetch All Relevant Receivables (Broad Range)
        const rawReceivables = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION',
                OR: [
                    { paymentDate: { gte: startBuffer, lte: endBuffer } },
                    { dueDate: { gte: startBuffer, lte: endBuffer } }
                ]
            },
            include: { subscription: true }
        });

        // Create lookup sets for fast identification
        const exclusiveSubsData = await prisma.subscription.findMany({
            where: { isExclusive: true } as any,
            select: { id: true, clientId: true, planName: true }
        });

        const exclusiveSubIds = new Set(exclusiveSubsData.map(s => s.id));
        const exclusiveClientIds = new Set(exclusiveSubsData.map(s => s.clientId));

        // Filter Receivables by Exclusivity
        const filteredReceivables = rawReceivables.filter(r => {
            const description = r.description || '';
            const sub = r.subscription as any;
            const planName = sub?.planName || '';

            // Criteria for Exclusivity:
            // 1. Linked to a subscription known to be exclusive
            // 2. Linked to a client known to have an exclusive subscription
            // 3. Subscription plan name contains "Exclusiva" or "Jhon"
            // 4. Record description contains "Exclusiva" or "Jhon"
            const isExclusive =
                (r.subscriptionId && exclusiveSubIds.has(r.subscriptionId)) ||
                (r.clientId && exclusiveClientIds.has(r.clientId)) ||
                /Exclusiva|Jhon/i.test(planName) ||
                /Exclusiva|Jhon/i.test(description) ||
                sub?.isExclusive === true;

            return isExclusiveMode ? isExclusive : !isExclusive;
        });

        // (Financial calculations moved below to ensure consistency with the list)

        // 3. Fetch Subscription Appointments (Broad Range)
        const rawAppointments = await prisma.appointment.findMany({
            where: {
                isSubscriptionAppointment: true,
                status: 'COMPLETED',
                date: {
                    gte: startBuffer,
                    lte: endBuffer,
                },
                client: {
                    subscriptions: {
                        some: {
                            isExclusive: isExclusiveMode,
                            status: 'ACTIVE'
                        } as any
                    }
                }
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

        // Filter Appointments In-Memory
        const appointments = rawAppointments.filter(app =>
            isWithinInterval(app.date, { start: startDate, end: endDate })
        );

        // 4. Calculate Global Metrics
        // Calculate total hours from appointments (using workedHoursSubscription)
        let totalServiceMinutes = 0;

        const processedAppointments = appointments.map(app => {
            // Se workedHoursSubscription estiver zerado (legado), calcular pela duração dos serviços
            let durationMinutes = app.workedHoursSubscription * 60;
            if (durationMinutes === 0) {
                const services = (app as any).services || [];
                durationMinutes = services.reduce((acc: any, s: any) => acc + s.service.duration, 0);
            }
            totalServiceMinutes += durationMinutes;

            return {
                ...app,
                durationMinutes
            };
        });

        const totalServiceHours = totalServiceMinutes / 60;

        // (Calculations moved below subscriber list for consistency)

        // 5. Build Detailed Subscriber List
        // Buscar todos os assinantes ativos para listar (FILTRADO POR TIPO)
        const allSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                isExclusive: isExclusiveMode
            } as any,
            include: { client: true }
        });

        const subscriberList = allSubscriptions.map(sub => {
            // Ver se tem conta paga este mês (Strict check using loaded list)
            const paidReceivable = rawReceivables.find(r =>
                r.clientId === sub.clientId &&
                r.status === 'PAID' &&
                r.paymentDate &&
                isWithinInterval(r.paymentDate, { start: startDate, end: endDate })
            );

            // Ver uso deste assinante no mês
            const usage = processedAppointments.filter(app => app.clientId === sub.clientId);
            const usageCount = usage.length;
            const usageMinutes = usage.reduce((acc, app) => acc + app.durationMinutes, 0);

            // Cast sub to any to safely access client
            const subAny = sub as any;

            return {
                id: sub.id,
                clientName: subAny.client?.name || 'Cliente',
                clientPhone: subAny.client?.phone || '',
                amount: sub.amount,
                billingDay: sub.billingDay,
                isPaid: !!paidReceivable,
                usageCount,
                usageMinutes
            };
        });

        // 6. Calculate Totals from Subscriber List (Ensures consistency)
        const paidSubscribers = subscriberList.filter(s => s.isPaid);
        const pendingSubscribers = subscriberList.filter(s => !s.isPaid);

        console.log(`[DEBUG] Finalizing report. Paid: ${paidSubscribers.length}, Pending: ${pendingSubscribers.length}`);

        const receivedAmount = paidSubscribers.reduce((sum, s) => {
            const val = Number(s.amount) || 0;
            console.log(` - Summing Paid: ${s.clientName}, Amount: ${val}`);
            return sum + val;
        }, 0);

        const pendingAmount = pendingSubscribers.reduce((sum, s) => {
            const val = Number(s.amount) || 0;
            console.log(` - Summing Pending: ${s.clientName}, Amount: ${val}`);
            return sum + val;
        }, 0);

        const grandTotal = receivedAmount + pendingAmount;

        console.log(`[DEBUG] Final Totals - Received: ${receivedAmount}, Pending: ${pendingAmount}, Grand: ${grandTotal}`);

        // 7. Calculate Derived Metrics
        const hourlyRate = totalServiceHours > 0
            ? receivedAmount / totalServiceHours
            : 0;

        // Frequência (Atendimentos Totais / Total de Assinantes que usaram ou total de ativos?)
        const subscriptionsCount = await prisma.subscription.count({
            where: {
                status: 'ACTIVE',
                isExclusive: isExclusiveMode
            } as any
        });

        const totalUsageCount = processedAppointments.length;
        const averageFrequency = subscriptionsCount > 0
            ? totalUsageCount / subscriptionsCount
            : 0;

        // 6. Build Barber Table Data
        const barberStats: Record<string, any> = {};
        const serviceNames = new Set<string>();

        processedAppointments.forEach(app => {
            const barber = (app as any).barber;
            const barberId = app.barberId;
            const barberName = barber.name;
            const commissionRate = barber.commissionRate;

            if (!barberStats[barberId]) {
                barberStats[barberId] = {
                    id: barberId,
                    name: barberName,
                    commissionRate,
                    totalMinutes: 0,
                    services: {}
                };
            }

            const services = (app as any).services || [];
            services.forEach((appService: any) => {
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
            subscribers: subscriberList,
            debug: {
                serverTime: new Date().toISOString(),
                range: { start: startDate, end: endDate },
                counts: {
                    rawReceivables: rawReceivables.length,
                    filteredReceivables: filteredReceivables.length,
                    paidFromList: paidSubscribers.length,
                    totalSubscribers: subscriberList.length
                }
            }
        });

    } catch (error) {
        console.error('Error serving subscription report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
