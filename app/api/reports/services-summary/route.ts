
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
        // We filter in memory or do aggregations. GroupBy is efficient but doing 3 groupBys might be cleaner.

        // Let's do 3 aggregate queries for simplicity and clarity

        // 1. Daily Stats
        const dailyStats = await prisma.appointmentService.groupBy({
            by: ['serviceId'],
            where: {
                appointment: {
                    date: { gte: dayStart, lte: dayEnd },
                    status: 'COMPLETED'
                }
            },
            _count: { serviceId: true },
            _sum: { price: true }
        });

        // 2. Weekly Stats
        const weeklyStats = await prisma.appointmentService.groupBy({
            by: ['serviceId'],
            where: {
                appointment: {
                    date: { gte: weekStart, lte: weekEnd },
                    status: 'COMPLETED'
                }
            },
            _count: { serviceId: true },
            _sum: { price: true }
        });

        // 3. Monthly Stats
        const monthlyStats = await prisma.appointmentService.groupBy({
            by: ['serviceId'],
            where: {
                appointment: {
                    date: { gte: monthStart, lte: monthEnd },
                    status: 'COMPLETED'
                }
            },
            _count: { serviceId: true },
            _sum: { price: true }
        });

        // Get all service names
        const services = await prisma.service.findMany({
            select: { id: true, name: true }
        });

        // Combine data
        const reportData = services.map(service => {
            const dayStat = dailyStats.find(s => s.serviceId === service.id);
            const weekStat = weeklyStats.find(s => s.serviceId === service.id);
            const monthStat = monthlyStats.find(s => s.serviceId === service.id);

            return {
                id: service.id,
                name: service.name,
                daily: {
                    count: dayStat?._count.serviceId || 0,
                    revenue: dayStat?._sum.price || 0
                },
                weekly: {
                    count: weekStat?._count.serviceId || 0,
                    revenue: weekStat?._sum.price || 0
                },
                monthly: {
                    count: monthStat?._count.serviceId || 0,
                    revenue: monthStat?._sum.price || 0
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
