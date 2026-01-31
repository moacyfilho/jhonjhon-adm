import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { getManausStartOfDay, getManausEndOfDay } from '@/lib/timezone';

// GET - Listar agendamentos online (autenticado)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    // Filtro por data única (compatibilidade)
    if (date) {
      where.scheduledDate = {
        gte: getManausStartOfDay(date),
        lte: getManausEndOfDay(date),
      };
    }
    // Filtro por período (para agenda visual)
    else if (startDateParam && endDateParam) {
      where.scheduledDate = {
        gte: getManausStartOfDay(startDateParam),
        lte: getManausEndOfDay(endDateParam),
      };
    }

    const bookings = await prisma.onlineBooking.findMany({
      where,
      include: {
        service: true,
        services: {
          include: {
            service: true
          }
        },
        barber: true,
        client: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    );
  }
}
