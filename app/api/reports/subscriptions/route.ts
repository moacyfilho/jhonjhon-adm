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
        // We look at AccountReceivable for SUBSCRIPTION category
        const receivables = await prisma.accountReceivable.groupBy({
            by: ['status'],
            where: {
                category: 'SUBSCRIPTION',
                dueDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const receivedAmount = receivables.find(r => r.status === 'PAID')?._sum.amount || 0;
        const pendingAmount = receivables.find(r => r.status === 'PENDING' || r.status === 'OVERDUE')?._sum.amount || 0;

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
        // Calculate total hours from appointments
        // We can use workedHoursSubscription if populated, or calculate from duration
        // Let's use workedHoursSubscription first, fallback to duration if 0
        let totalServiceMinutes = 0;

        const processedAppointments = appointments.map(app => {
            // Calculate duration for this appointment
            // If workedHoursSubscription is stored as hours, convert to minutes. 
            // If it's 0, use sum of services duration.
            let durationMinutes = app.workedHoursSubscription * 60;

            if (durationMinutes === 0) {
                // Fallback to service durations
                durationMinutes = app.services.reduce((acc, s) => acc + s.service.duration, 0);
            }

            totalServiceMinutes += durationMinutes;

            return {
                ...app,
                durationMinutes
            };
        });

        const totalServiceHours = totalServiceMinutes / 60;

        // Avoid division by zero
        const hourlyRate = totalServiceHours > 0
            ? receivedAmount / totalServiceHours
            : 0;

        // 4. Build Table Data
        // We need a list of all Barbers and all Service Names used involved
        const barberStats: Record<string, any> = {};
        const serviceNames = new Set<string>();

        // Initial pass to setup barbers
        processedAppointments.forEach(app => {
            const barberName = app.barber.name;
            if (!barberStats[barberName]) {
                barberStats[barberName] = {
                    id: app.barberId,
                    name: barberName,
                    totalMinutes: 0,
                    services: {}
                };
            }

            // Group by Service Name
            // An appointment might have multiple services. 
            // For the table, we usually categorize the appointment by its "Main" service or split it.
            // The image shows "Corte Assinante", "Corte & Barba". 
            // Let's iterate services.
            app.services.forEach(appService => {
                const serviceName = appService.service.name;
                serviceNames.add(serviceName);

                if (!barberStats[barberName].services[serviceName]) {
                    barberStats[barberName].services[serviceName] = {
                        count: 0,
                        minutes: 0
                    };
                }

                barberStats[barberName].services[serviceName].count += 1;
                barberStats[barberName].services[serviceName].minutes += appService.service.duration;

                // Allow total to accumulate
                barberStats[barberName].totalMinutes += appService.service.duration;
            });
        });

        // Format for response
        const barbers = Object.values(barberStats).map(b => {
            const totalHours = b.totalMinutes / 60;
            const totalValue = totalHours * hourlyRate;

            return {
                name: b.name,
                services: b.services,
                totalHours,
                totalValue,
                commission: totalValue * 0.45,
                house: totalValue * 0.55
            };
        });

        // Add "Casa" summary (sum of all house shares? or is "Casa" a separate entity in the columns?)
        // The image shows "Casa" as a column. 
        // Usually "Casa" column implies the shop's share generated by that professional?
        // OR it's a "Casa" professional. 
        // Re-reading user: "cada profissional ganha 45% de comissão e a casa fica com 55%"
        // Image 2 has a column for "Jhon", "Maikon", "Eduardo", "Kauã" AND "Casa". 
        // "Casa" column likely aggregates metrics for a generic "House" user or is just a summary column?
        // But it has values for service counts. 
        // Let's just return the barbers list. If "Casa" is a barber in the DB, it will show up.

        // Sort barbers by name?
        barbers.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            metrics: {
                received: receivedAmount,
                pending: pendingAmount,
                totalHours: totalServiceHours,
                hourlyRate: hourlyRate
            },
            table: {
                serviceNames: Array.from(serviceNames).sort(),
                barbers
            }
        });

    } catch (error) {
        console.error('Error serving subscription report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
