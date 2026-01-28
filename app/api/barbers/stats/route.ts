import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';

interface JWTPayload {
  barberId: string;
  type: string;
}

function verifyBarberToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.type !== 'barber') {
      return null;
    }
    return decoded.barberId;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const barberId = verifyBarberToken(request);

    if (!barberId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Atendimentos do mês atual
    const currentMonthAppointments = await prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        status: 'COMPLETED',
      },
    });

    // Atendimentos do mês passado
    const lastMonthAppointments = await prisma.appointment.count({
      where: {
        barberId,
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        status: 'COMPLETED',
      },
    });

    // Comissões do mês atual
    const currentMonthCommissions = await prisma.commission.aggregate({
      where: {
        barberId,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Comissões pagas
    const paidCommissions = await prisma.commission.aggregate({
      where: {
        barberId,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    // Comissões pendentes
    const pendingCommissions = await prisma.commission.aggregate({
      where: {
        barberId,
        status: 'PENDING',
      },
      _sum: {
        amount: true,
      },
    });

    // Horas trabalhadas do mês atual
    const currentMonthHours = await prisma.appointment.aggregate({
      where: {
        barberId,
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        workedHours: true,
        workedHoursSubscription: true,
      },
    });

    // Próximos agendamentos (hoje e futuros)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        status: { in: ['SCHEDULED', 'COMPLETED'] },
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });

    // Histórico de comissões dos últimos 6 meses
    const sixMonthsAgo = subMonths(now, 6);
    const commissionsHistory = await prisma.commission.groupBy({
      by: ['createdAt'],
      where: {
        barberId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      currentMonth: {
        appointments: currentMonthAppointments,
        commissions: currentMonthCommissions._sum.amount || 0,
        workedHours: currentMonthHours._sum.workedHours || 0,
        workedHoursSubscription: currentMonthHours._sum.workedHoursSubscription || 0,
      },
      lastMonth: {
        appointments: lastMonthAppointments,
      },
      commissions: {
        paid: paidCommissions._sum.amount || 0,
        pending: pendingCommissions._sum.amount || 0,
        total: (paidCommissions._sum.amount || 0) + (pendingCommissions._sum.amount || 0),
      },
      upcomingAppointments,
      commissionsHistory: commissionsHistory.map(item => ({
        date: item.createdAt,
        amount: item._sum.amount || 0,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do barbeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
