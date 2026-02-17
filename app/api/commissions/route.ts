import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Verificar role e filtrar se for BARBER
    let filterBarberId: string | null = null;
    const userRole = (session.user as any).role;

    if (userRole === 'BARBER') {
      if (!session.user.email) {
        return NextResponse.json({ error: "Email não encontrado na sessão" }, { status: 400 });
      }

      const barber = await prisma.barber.findUnique({
        where: { email: session.user.email }
      });

      if (!barber) {
        // Usuário tem role BARBER mas não achamos o registro na tabela Barber
        return NextResponse.json([]);
      }
      filterBarberId = barber.id;
    }

    const where: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        where.appointment = {
          date: {
            gte: start,
            lte: end,
          },
        };
      }
    }

    // Filtro de segurança
    if (filterBarberId) {
      where.barberId = filterBarberId;
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

    // Group by barber (filtrando se necessário)
    const barbers = await prisma.barber.findMany({
      where: {
        isActive: true,
        ...(filterBarberId ? { id: filterBarberId } : {})
      },
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
    const session = await getServerSession(authOptions);
    if (!session) {
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
