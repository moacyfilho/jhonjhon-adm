
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();

        // Manaus é UTC-4: meia-noite de Manaus = 04:00 UTC
        const manausDateOf = (d: Date) =>
            new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

        const todayManaus = manausDateOf(today);
        const [y, m, d] = todayManaus.split('-').map(Number);

        // Hoje em Manaus
        const dayStart = new Date(`${todayManaus}T04:00:00.000Z`);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

        // Semana (domingo a sábado) em Manaus
        const dayOfWeek = new Date(today.toLocaleString('en-US', { timeZone: 'America/Manaus' })).getDay();
        const weekStart = new Date(dayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

        // Mês em Manaus
        const monthStart = new Date(`${y}-${String(m).padStart(2, '0')}-01T04:00:00.000Z`);
        const nextMonthStr = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const monthEnd = new Date(new Date(`${nextMonthStr}T04:00:00.000Z`).getTime() - 1);


        // Fetch all completed appointment services within the widest range (Month)
        // Using findMany + in-memory aggregation because Prisma groupBy doesn't support filtering by relation fields yet.
        const allItems = await prisma.appointmentService.findMany({
            where: {
                appointment: {
                    date: { gte: monthStart, lte: monthEnd },
                    status: 'COMPLETED'
                }
            },
            select: {
                serviceId: true,
                price: true,
                appointment: {
                    select: {
                        date: true
                    }
                }
            }
        });

        // Helper maps
        const dailyMap = new Map<string, { count: number, revenue: number }>();
        const weeklyMap = new Map<string, { count: number, revenue: number }>();
        const monthlyMap = new Map<string, { count: number, revenue: number }>();

        for (const item of allItems) {
            const date = new Date(item.appointment.date);
            const serviceId = item.serviceId;
            const price = item.price || 0;

            // Monthly (all items match query)
            if (!monthlyMap.has(serviceId)) monthlyMap.set(serviceId, { count: 0, revenue: 0 });
            const m = monthlyMap.get(serviceId)!;
            m.count++;
            m.revenue += price;

            // Weekly
            if (date >= weekStart && date <= weekEnd) {
                if (!weeklyMap.has(serviceId)) weeklyMap.set(serviceId, { count: 0, revenue: 0 });
                const w = weeklyMap.get(serviceId)!;
                w.count++;
                w.revenue += price;
            }

            // Daily
            if (date >= dayStart && date <= dayEnd) {
                if (!dailyMap.has(serviceId)) dailyMap.set(serviceId, { count: 0, revenue: 0 });
                const d = dailyMap.get(serviceId)!;
                d.count++;
                d.revenue += price;
            }
        }


        // Get all service names
        const services = await prisma.service.findMany({
            select: { id: true, name: true }
        });

        // Combine data

        // Combine data
        const reportData = services.map(service => {
            const dayStat = dailyMap.get(service.id);
            const weekStat = weeklyMap.get(service.id);
            const monthStat = monthlyMap.get(service.id);

            return {
                id: service.id,
                name: service.name,
                daily: {
                    count: dayStat?.count || 0,
                    revenue: dayStat?.revenue || 0
                },
                weekly: {
                    count: weekStat?.count || 0,
                    revenue: weekStat?.revenue || 0
                },
                monthly: {
                    count: monthStat?.count || 0,
                    revenue: monthStat?.revenue || 0
                }
            };
        });


        // Sort by monthly count descending
        reportData.sort((a, b) => b.monthly.count - a.monthly.count);

        return NextResponse.json(reportData);

    } catch (error) {
        console.error("Error generating services summary report:", error);
        return NextResponse.json(
            { error: "Erro ao gerar relatório de serviços" },
            { status: 500 }
        );
    }
}
