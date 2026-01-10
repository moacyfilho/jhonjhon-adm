import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import {
  getManausStartOfDay,
  getManausEndOfDay,
  createManausDate
} from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// GET - Listar bloqueios de horário (para admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    // Verificar conflitos com agendamentos existentes (checando horário)
    // Usando horário de Manaus para query no banco e cálculos
    const searchStart = getManausStartOfDay(date);
    const searchEnd = getManausEndOfDay(date);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: searchStart,
          lte: searchEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Datas de bloqueio em UTC (correspondente ao horário de Manaus)
    const blockStart = createManausDate(date, startHour, startMinute);
    const blockEnd = createManausDate(date, endHour, endMinute);

    const conflicts = existingAppointments.filter((appointment) => {
      // Data do agendamento já está em UTC no banco
      const apptStart = new Date(appointment.date);
      const durationMinutes = appointment.services.reduce(
        (acc, s) => acc + s.service.duration,
        0
      );
      const apptEnd = new Date(apptStart.getTime() + durationMinutes * 60000);

      // Verifica sobreposição de horário
      // (StartA < EndB) && (EndA > StartB)
      return apptStart < blockEnd && apptEnd > blockStart;
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível bloquear este horário pois existem agendamentos confirmados',
          conflicts: conflicts.length,
        },
        { status: 409 }
      );
    }

    // Verificar conflitos com OUTROS BLOQUEIOS existentes
    const existingBlocks = await prisma.scheduleBlock.findMany({
      where: {
        barberId,
        date: {
          gte: searchStart,
          lte: searchEnd,
        },
      },
    });

    const blockConflicts = existingBlocks.filter((b) => {
      // Converter strings HH:mm para Date hoje (UTC)
      const [bStartH, bStartM] = b.startTime.split(':').map(Number);
      const [bEndH, bEndM] = b.endTime.split(':').map(Number);

      const bStart = createManausDate(date, bStartH, bStartM);
      const bEnd = createManausDate(date, bEndH, bEndM);

      // (StartA < EndB) && (EndA > StartB)
      return blockStart < bEnd && blockEnd > bStart;
    });

    if (blockConflicts.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um bloqueio para este horário' },
        { status: 409 }
      );
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        barberId,
        // Armazena a "Data" do bloqueio normalizada para o início do dia em Manaus
        // Isso garante que queries usando timezone funcionem corretamente
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
