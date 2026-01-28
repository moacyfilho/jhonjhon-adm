import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

// Using singleton prisma from lib/db

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // month, week, today

    // Define o período
    const now = new Date();
    let startDate: Date;

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Total de atendimentos no período
    const totalAppointments = await prisma.appointment.count({
      where: {
        date: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
    });

    // Faturamento total no período
    const revenue = await prisma.appointment.aggregate({
      where: {
        date: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenue._sum?.totalAmount || 0;

    // Ticket médio
    const averageTicket =
      totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    // Barbeiro destaque (mais atendimentos)
    const topBarber = await prisma.appointment.groupBy({
      by: ["barberId"],
      where: {
        date: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 1,
    });

    let topBarberInfo = null;
    if (topBarber.length > 0) {
      const barberData = await prisma.barber.findUnique({
        where: { id: topBarber[0].barberId },
      });
      topBarberInfo = {
        name: barberData?.name || "",
        count: topBarber[0]._count.id,
      };
    }

    // Faturamento por dia (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const revenueByDay = await Promise.all(
      last7Days.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayRevenue = await prisma.appointment.aggregate({
          where: {
            date: {
              gte: date,
              lt: nextDate,
            },
            status: "COMPLETED",
          },
          _sum: {
            totalAmount: true,
          },
        });

        return {
          date: date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          revenue: dayRevenue._sum?.totalAmount || 0,
        };
      })
    );

    // Atendimentos por barbeiro
    const appointmentsByBarber = await prisma.appointment.groupBy({
      by: ["barberId"],
      where: {
        date: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
      _count: {
        id: true,
      },
    });

    // Buscar todos os barbeiros de uma vez (mais eficiente)
    const barberIds = appointmentsByBarber.map(item => item.barberId);
    const barbers = await prisma.barber.findMany({
      where: { id: { in: barberIds } },
      select: { id: true, name: true },
    });
    
    const barbersMap = new Map(barbers.map(b => [b.id, b.name]));
    const barbersData = appointmentsByBarber.map((item) => ({
      name: barbersMap.get(item.barberId) || "Desconhecido",
      count: item._count.id,
    }));

    // Serviços mais vendidos
    const topServices = await prisma.appointmentService.groupBy({
      by: ["serviceId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    // Buscar todos os serviços de uma vez (mais eficiente)
    const serviceIds = topServices.map(item => item.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    
    const servicesMap = new Map(services.map(s => [s.id, s.name]));
    const servicesData = topServices.map((item) => ({
      name: servicesMap.get(item.serviceId) || "Desconhecido",
      count: item._count.id,
    }));

    // Formas de pagamento
    const paymentMethods = await prisma.appointment.groupBy({
      by: ["paymentMethod"],
      where: {
        date: {
          gte: startDate,
        },
        status: "COMPLETED",
      },
      _count: {
        id: true,
      },
    });

    const paymentData = paymentMethods.map((item) => {
      const labels: Record<string, string> = {
        CASH: "Dinheiro",
        DEBIT_CARD: "Cartão Débito",
        CREDIT_CARD: "Cartão Crédito",
        PIX: "PIX",
      };
      return {
        method: labels[item.paymentMethod] || item.paymentMethod,
        count: item._count.id,
      };
    });

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalAppointments,
        averageTicket,
        topBarber: topBarberInfo,
      },
      charts: {
        revenueByDay,
        appointmentsByBarber: barbersData,
        topServices: servicesData,
        paymentMethods: paymentData,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}
