import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, parseISO, subDays, addDays, isWithinInterval } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dateParam = searchParams.get('date'); // YYYY-MM-DD
        const startDateParam = searchParams.get('startDate'); // YYYY-MM-DD
        const endDateParam = searchParams.get('endDate'); // YYYY-MM-DD
        const type = searchParams.get('type') || 'standard'; // 'standard' | 'exclusive'
        const isExclusiveMode = type === 'exclusive';

        // Determine date range: custom range > month > current month
        let startDate: Date, endDate: Date;
        if (startDateParam && endDateParam) {
            startDate = parseISO(startDateParam);
            endDate = parseISO(endDateParam);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const referenceDate = dateParam ? parseISO(dateParam) : new Date();
            startDate = startOfMonth(referenceDate);
            endDate = endOfMonth(referenceDate);
        }

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
            // 3. Subscription plan name contains "Exclusiva" (NOT "Jhon" — "Jhonjhon" is the standard plan name)
            // 4. Record description contains "Exclusiva"
            const isExclusive =
                (r.subscriptionId && exclusiveSubIds.has(r.subscriptionId)) ||
                (r.clientId && exclusiveClientIds.has(r.clientId)) ||
                /Exclusiva/i.test(planName) ||
                /Exclusiva/i.test(description) ||
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
                client: {
                    include: {
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            take: 1,
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                }
            },
        });

        // Filter Appointments In-Memory
        const appointments = rawAppointments.filter(app =>
            isWithinInterval(app.date, { start: startDate, end: endDate })
        );

        // Helper: parse servicesIncluded JSON/CSV → array of lowercase strings
        const parseIncludedServices = (raw: string | null | undefined): string[] => {
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.services && Array.isArray(parsed.services)) {
                    return parsed.services.map((s: string) => s.trim().toLowerCase());
                }
            } catch {
                return raw.split(/[,+]/).map(s => s.trim().toLowerCase()).filter(Boolean);
            }
            return [];
        };

        const isServiceIncluded = (serviceName: string, included: string[]): boolean => {
            if (included.length === 0) return true; // sem dados: todos incluídos
            const name = serviceName.toLowerCase().trim();
            return included.some(inc => name.includes(inc) || inc.includes(name));
        };

        // 4. Calculate Global Metrics
        // Contar apenas minutos dos serviços incluídos na assinatura (excluir extras pagos)
        let totalServiceMinutes = 0;
        let totalWorkedHours = 0; // usando workedHoursSubscription (mesma fonte do recalculate-commissions)

        const processedAppointments = appointments.map(app => {
            const clientSub = (app as any).client?.subscriptions?.[0];
            const includedServices = parseIncludedServices(clientSub?.servicesIncluded);

            // Somar só duração dos serviços da assinatura (para exibição das horas em atendimentos)
            const services = (app as any).services || [];
            let durationMinutes = 0;
            for (const s of services) {
                if (isServiceIncluded(s.service.name, includedServices)) {
                    durationMinutes += s.service.duration;
                }
            }

            totalServiceMinutes += durationMinutes;

            // workedHoursSubscription é o campo preferido; fallback para durationMinutes em appointments antigos
            const storedWorkedHours = Number((app as any).workedHoursSubscription) || 0;
            const workedHours = storedWorkedHours > 0 ? storedWorkedHours : durationMinutes / 60;
            totalWorkedHours += workedHours;

            return {
                ...app,
                durationMinutes,
                workedHours
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
            // Busca por subscriptionId (preciso) ou clientId (fallback para registros antigos)
            // Usar filteredReceivables para garantir que o AR encontrado é do mesmo tipo (standard/exclusiva)
            const paidReceivable = filteredReceivables.find(r =>
                (r.subscriptionId === sub.id || r.clientId === sub.clientId) &&
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
        // arReceivedAmount: receita real pelos ARs pagos no período (mesma fonte do recalculate-commissions)
        const arReceivedAmount = filteredReceivables
            .filter(r =>
                r.status === 'PAID' &&
                r.paymentDate &&
                isWithinInterval(r.paymentDate, { start: startDate, end: endDate })
            )
            .reduce((sum, r) => sum + Number(r.amount), 0);

        // hourlyRate para exibição no cabeçalho (baseado em horas de serviço e receita dos planos)
        const hourlyRate = totalServiceHours > 0
            ? receivedAmount / totalServiceHours
            : 0;
        // effectiveHourlyRate para cálculo de comissão (baseado em workedHoursSubscription)
        const effectiveHourlyRate = totalWorkedHours > 0
            ? receivedAmount / totalWorkedHours
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

        // 6b. Build Barber Table Data
        const barberStats: Record<string, any> = {};
        const serviceNames = new Set<string>();

        processedAppointments.forEach(app => {
            const barber = (app as any).barber;
            const barberId = app.barberId;
            const barberName = barber.name;
            const commissionRate = barber.commissionRate;
            const hourlyRateBarber = barber.hourlyRate || 0;

            // Serviços incluídos na assinatura do cliente
            const clientSub = (app as any).client?.subscriptions?.[0];
            const includedServices = parseIncludedServices(clientSub?.servicesIncluded);

            if (!barberStats[barberId]) {
                barberStats[barberId] = {
                    id: barberId,
                    name: barberName,
                    commissionRate,
                    hourlyRate: hourlyRateBarber,
                    totalMinutes: 0,     // minutos de serviço (para exibição)
                    totalWorkedHours: 0, // workedHoursSubscription (para cálculo de comissão)
                    services: {}
                };
            }

            // Acumular workedHoursSubscription do barbeiro (fonte correta para comissão)
            barberStats[barberId].totalWorkedHours += (app as any).workedHours || 0;

            const services = (app as any).services || [];
            services.forEach((appService: any) => {
                const serviceName = appService.service.name;
                const isSubscriptionService = isServiceIncluded(serviceName, includedServices);

                if (isSubscriptionService) {
                    // Serviço da assinatura → aparece na tabela e nas horas
                    serviceNames.add(serviceName);

                    if (!barberStats[barberId].services[serviceName]) {
                        barberStats[barberId].services[serviceName] = { count: 0, minutes: 0 };
                    }

                    barberStats[barberId].services[serviceName].count += 1;
                    barberStats[barberId].services[serviceName].minutes += appService.service.duration;
                    barberStats[barberId].totalMinutes += appService.service.duration;
                }
                // Serviços extras não entram no relatório de assinatura
            });
        });

        // Format for response
        const barbers = Object.values(barberStats).map(b => {
            const totalHours = b.totalMinutes / 60;
            const totalValue = totalHours * hourlyRate;

            // Comissão = workedHoursSubscription × effectiveHourlyRate × commissionRate%
            const commission = b.totalWorkedHours * effectiveHourlyRate * (b.commissionRate / 100);
            const house = totalValue - commission;

            return {
                name: b.name,
                services: b.services,
                totalHours,
                totalValue,
                commission,
                house
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
