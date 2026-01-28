import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

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

    if (status) {
      where.status = status;
    }

    // Filtro por data única (compatibilidade)
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      where.scheduledDate = {
        gte: startDate,
        lte: endDate,
      };
    }
    // Filtro por período (para agenda visual)
    else if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);

      where.scheduledDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const bookings = await prisma.onlineBooking.findMany({
      where,
      include: {
        service: true,
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
