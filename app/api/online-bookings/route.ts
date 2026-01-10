import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar agendamentos online (autenticado)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
      const dateObj = new Date(date);

      // Início do dia em Manaus = 04:00 UTC do mesmo dia
      const startDate = new Date(dateObj);
      startDate.setUTCHours(4, 0, 0, 0);

      // Fim do dia em Manaus = 03:59:59 UTC do dia seguinte
      const endDate = new Date(dateObj);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      endDate.setUTCHours(3, 59, 59, 999);

      where.scheduledDate = {
        gte: startDate,
        lte: endDate,
      };
    }
    // Filtro por período (para agenda visual)
    else if (startDateParam && endDateParam) {
      const startDateObj = new Date(startDateParam);
      const endDateObj = new Date(endDateParam);

      // Início do dia em Manaus = 04:00 UTC do mesmo dia
      const startDate = new Date(startDateObj);
      startDate.setUTCHours(4, 0, 0, 0);

      // Fim do dia em Manaus = 03:59:59 UTC do dia seguinte
      const endDate = new Date(endDateObj);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      endDate.setUTCHours(3, 59, 59, 999);

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
