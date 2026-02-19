
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

        // Define ranges
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday start
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);


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
