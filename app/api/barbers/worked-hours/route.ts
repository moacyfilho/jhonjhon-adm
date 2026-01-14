import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Default: current month
    const start = startDate ? new Date(startDate) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : endOfMonth(new Date());

    // Buscar todos os barbeiros ativos
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Para cada barbeiro, buscar suas horas trabalhadas e comissões
    const barbersData = await Promise.all(
      barbers.map(async (barber) => {
        // Buscar atendimentos concluídos no período
        const appointments = await prisma.appointment.findMany({
          where: {
            barberId: barber.id,
            status: "COMPLETED",
            date: {
              gte: start,
              lte: end,
            },
          },
          include: {
            client: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        // Buscar comissões no período
        const commissions = await prisma.commission.findMany({
          where: {
            barberId: barber.id,
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        });

        // Calcular totais
        const totalHours = appointments.reduce(
          (sum, apt) => sum + (apt.workedHours || 0) + ((apt as any).workedHoursSubscription || 0),
          0
        );
        const totalAppointments = appointments.length;
        const totalCommissionPaid = commissions
          .filter((c) => c.status === "PAID")
          .reduce((sum, c) => sum + c.amount, 0);
        const totalCommissionPending = commissions
          .filter((c) => c.status === "PENDING")
          .reduce((sum, c) => sum + c.amount, 0);
        const totalCommission = totalCommissionPaid + totalCommissionPending;

        return {
          id: barber.id,
          name: barber.name,
          phone: barber.phone,
          commissionRate: barber.commissionRate,
          totalHours: Math.round(totalHours * 100) / 100, // 2 decimais
          totalAppointments,
          totalCommission,
          totalCommissionPaid,
          totalCommissionPending,
          appointments: appointments.map((apt) => ({
            id: apt.id,
            date: apt.date,
            clientName: apt.client.name,
            services: apt.services.map((s) => s.service.name).join(", "),
            workedHours: (apt.workedHours || 0) + ((apt as any).workedHoursSubscription || 0),
            totalAmount: apt.totalAmount,
          })),
        };
      })
    );

    return NextResponse.json({
      barbers: barbersData,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching worked hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch worked hours" },
      { status: 500 }
    );
  }
}
