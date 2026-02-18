import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "month"; // month, week, today
        const barberId = searchParams.get("barberId");

        // Define o período
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (period === "today") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (period === "week") {
            startDate = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
            endDate = endOfWeek(now, { weekStartsOn: 0 });
        } else {
            // month
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        const whereClause: any = {
            date: {
                gte: startDate,
                lte: endDate,
            },
            status: {
                in: ["COMPLETED", "SCHEDULED"], // Include scheduled for predictive heatmap
            },
        };

        if (barberId && barberId !== 'all') {
            whereClause.barberId = barberId;
        }

        // Fetch appointments (just date needed for basic heatmap)
        // To handle duration properly, we need duration from Service.
        // Fetching minimal data for performance
        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            select: {
                date: true,
                // If we want to account for duration, we need services.
                // For simplicity and "surpresa", let's focus on Start Time density first.
                // Or fetch services to expand duration?
                // Let's stick to start time density for now as it's the primary indicator.
            },
        });

        // Process heatmap
        // 7 days x 24 hours
        // But typically barbershops open e.g. 8-20.
        // We'll collect all hours and filter on frontend or return full range.

        const heatmapData: Record<string, number> = {};
        let maxCount = 0;

        appointments.forEach((app) => {
            const date = new Date(app.date);
            const day = date.getDay(); // 0-6
            const hour = date.getHours(); // 0-23

            const key = `${day}-${hour}`;
            heatmapData[key] = (heatmapData[key] || 0) + 1;

            if (heatmapData[key] > maxCount) {
                maxCount = heatmapData[key];
            }
        });

        // Convert to array format for Recharts or custom grid
        const result = [];
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                const count = heatmapData[`${d}-${h}`] || 0;
                if (count > 0) { // Only send data points to save bandwidth?
                    // Or send complete grid? Sending relevant range (e.g. 8-22) is better.
                    if (h >= 7 && h <= 22) { // 7am to 10pm usually covers it
                        result.push({
                            day: d,
                            hour: h,
                            count: count,
                            intensity: maxCount > 0 ? count / maxCount : 0
                        });
                    }
                } else if (h >= 7 && h <= 22) {
                    result.push({
                        day: d,
                        hour: h,
                        count: 0,
                        intensity: 0
                    });
                }
            }
        }

        return NextResponse.json({
            data: result,
            maxCount,
            period: { start: startDate, end: endDate }
        });

    } catch (error) {
        console.error("Heatmap error:", error);
        return NextResponse.json(
            { error: "Erro ao gerar mapa de calor" },
            { status: 500 }
        );
    }
}
