import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

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

    const where: any = {};

    if (startDate && endDate) {
      where.appointment = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        barber: true,
        appointment: {
          include: {
            client: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by barber
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
    });

    const commissionsData = barbers.map(barber => {
      const barberCommissions = commissions.filter(c => c.barberId === barber.id);
      const totalAppointments = barberCommissions.length;
      const totalRevenue = barberCommissions.reduce((sum, c) => sum + c.appointment.totalAmount, 0);
      const totalCommission = barberCommissions.reduce((sum, c) => sum + c.amount, 0);
      const paidCommission = barberCommissions
        .filter(c => c.status === "PAID")
        .reduce((sum, c) => sum + c.amount, 0);
      const pendingCommission = totalCommission - paidCommission;

      return {
        barber: {
          id: barber.id,
          name: barber.name,
          commissionRate: barber.commissionRate,
        },
        totalAppointments,
        totalRevenue,
        totalCommission,
        paidCommission,
        pendingCommission,
        appointments: barberCommissions.map(c => ({
          id: c.appointmentId,
          date: c.appointment.date,
          totalAmount: c.appointment.totalAmount,
          commissionAmount: c.amount,
          commissionPaid: c.status === "PAID",
          commissionId: c.id,
          client: c.appointment.client,
          services: c.appointment.services,
        })),
      };
    }).filter(b => b.totalAppointments > 0);

    return NextResponse.json(commissionsData);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, barberId, clientId, serviceId, amount, status } = body;

    // Validações
    if (!barberId || amount === undefined) {
      return NextResponse.json(
        { error: "Barbeiro e valor são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar comissão
    const commission = await prisma.commission.create({
      data: {
        appointmentId,
        barberId,
        amount: parseFloat(amount),
        status: status || 'PENDING',
      },
      include: {
        barber: true,
        appointment: {
          include: {
            client: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(commission);
  } catch (error) {
    console.error("Error creating commission:", error);
    return NextResponse.json(
      { error: "Failed to create commission" },
      { status: 500 }
    );
  }
}
