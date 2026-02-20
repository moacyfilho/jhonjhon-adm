import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { getManausStartOfDay, getManausEndOfDay } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// GET - Listar bloqueios de horário (para admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {};

    if (barberId) {
      whereClause.barberId = barberId;
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: getManausStartOfDay(startDate),
        lte: getManausEndOfDay(endDate),
      };
    }

    const blocks = await prisma.scheduleBlock.findMany({
      where: whereClause,
      include: {
        barber: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar bloqueios' },
      { status: 500 }
    );
  }
}

// POST - Criar bloqueio de horário (para admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { barberId, date, startTime, endTime, reason } = await request.json();

    if (!barberId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Barbeiro, data, horário de início e fim são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o horário de fim é depois do início
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'Horário de fim deve ser depois do início' },
        { status: 400 }
      );
    }

    // Verificar se o barbeiro existe
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 }
      );
    }

    // Verificar conflitos com agendamentos existentes no intervalo de horário
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        status: { not: 'CANCELLED' },
        date: {
          gte: getManausStartOfDay(date),
          lte: getManausEndOfDay(date),
        },
      },
      include: {
        services: { include: { service: true } },
      },
    });

    const getMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const blockStart = getMinutes(startTime);
    const blockEnd = getMinutes(endTime);

    const conflicting = existingAppointments.filter(appt => {
      const apptTimeStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Manaus',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(appt.date));
      const duration = appt.services.reduce(
        (sum: number, s: any) => sum + (s.service?.duration || 30), 0
      );
      const apptStart = getMinutes(apptTimeStr);
      const apptEnd = apptStart + duration;
      return apptStart < blockEnd && apptEnd > blockStart;
    });

    if (conflicting.length > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível bloquear este horário pois existem agendamentos no período',
          conflicts: conflicting.length,
        },
        { status: 409 }
      );
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        barberId,
        date: getManausStartOfDay(date),
        startTime,
        endTime,
        reason,
      },
      include: {
        barber: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar bloqueio:', error);
    return NextResponse.json(
      { error: 'Erro ao criar bloqueio' },
      { status: 500 }
    );
  }
}

// DELETE - Remover bloqueio de horário (para admin)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('id');

    if (!blockId) {
      return NextResponse.json(
        { error: 'ID do bloqueio é obrigatório' },
        { status: 400 }
      );
    }

    const block = await prisma.scheduleBlock.findUnique({
      where: { id: blockId },
    });

    if (!block) {
      return NextResponse.json(
        { error: 'Bloqueio não encontrado' },
        { status: 404 }
      );
    }

    await prisma.scheduleBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover bloqueio:', error);
    return NextResponse.json(
      { error: 'Erro ao remover bloqueio' },
      { status: 500 }
    );
  }
}
