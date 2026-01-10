import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  getManausNow,
  toManausTime,
  getManausStartOfDay,
  getManausEndOfDay,
  isSameDayManaus,
  createManausDate
} from '@/lib/timezone';

const dayMapping: { [key: string]: string } = {
  '0': 'sunday',
  '1': 'monday',
  '2': 'tuesday',
  '3': 'wednesday',
  '4': 'thursday',
  '5': 'friday',
  '6': 'saturday',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // formato: YYYY-MM-DD
    const barberId = searchParams.get('barberId') || null;

    if (!dateStr) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }

    // Busca configurações
    const settings = await prisma.bookingSettings.findFirst();

    if (!settings) {
      return NextResponse.json(
        { error: 'Configurações não encontradas' },
        { status: 404 }
      );
    }

    // Usa horário de Manaus para todas as comparações
    const targetDate = getManausStartOfDay(dateStr);
    const nowManaus = getManausNow();
    const todayManaus = getManausStartOfDay(
      `${nowManaus.getUTCFullYear()}-${String(nowManaus.getUTCMonth() + 1).padStart(2, '0')}-${String(nowManaus.getUTCDate()).padStart(2, '0')}`
    );

    // Verifica se a data está dentro do período permitido
    const maxDate = new Date(nowManaus.getTime());
    maxDate.setUTCDate(maxDate.getUTCDate() + settings.advanceBookingDays);

    if (targetDate > maxDate) {
      return NextResponse.json(
        { error: 'Data excede o período de agendamento permitido' },
        { status: 400 }
      );
    }

    // Verifica se a data é passada
    if (targetDate < todayManaus) {
      return NextResponse.json({ error: 'Data já passou' }, { status: 400 });
    }

    // Pega o dia da semana (usando horário de Manaus)
    const manausTargetDate = toManausTime(targetDate);
    const dayOfWeek = manausTargetDate.getUTCDay();
    const dayKey = dayMapping[dayOfWeek.toString()];

    const schedule = settings.schedule as any;
    const daySchedule = schedule[dayKey];

    console.log(`[available-slots] Dia da semana: ${dayKey}`);
    console.log(`[available-slots] Configuração do dia:`, JSON.stringify(daySchedule));

    if (!daySchedule || !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0) {
      console.log(`[available-slots] ❌ Sem horários configurados para ${dayKey}`);
      console.log(`[available-slots] - Dia existe: ${!!daySchedule}`);
      console.log(`[available-slots] - Dia habilitado: ${daySchedule?.enabled}`);
      console.log(`[available-slots] - Slots configurados: ${daySchedule?.slots?.length || 0}`);
      return NextResponse.json({ slots: [] }); // Sem horários disponíveis
    }

    // Lista de todos os horários do dia
    const allSlots = daySchedule.slots as string[];

    // Busca agendamentos existentes para a data (usando horário de Manaus)
    const startOfDay = getManausStartOfDay(dateStr);
    const endOfDay = getManausEndOfDay(dateStr);

    // Busca agendamentos online (página pública)
    const existingOnlineBookings = await prisma.onlineBooking.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        ...(barberId ? { barberId } : {}),
      },
      select: {
        scheduledDate: true,
        barberId: true,
      },
    });

    // Busca agendamentos do sistema administrativo (atendimentos)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED', // Exclui apenas cancelados
        },
        ...(barberId ? { barberId } : {}),
      },
      select: {
        date: true,
        barberId: true,
      },
    });

    // Busca bloqueios de horário (ScheduleBlock)
    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(barberId ? { barberId } : {}),
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Combina horários ocupados de AMBAS as tabelas (convertendo para horário de Manaus)
    const occupiedSlotsArray = [
      ...existingOnlineBookings.map((booking) => {
        const manausDate = toManausTime(new Date(booking.scheduledDate));
        return `${String(manausDate.getUTCHours()).padStart(2, '0')}:${String(manausDate.getUTCMinutes()).padStart(2, '0')}`;
      }),
      ...existingAppointments.map((appointment) => {
        const manausDate = toManausTime(new Date(appointment.date));
        return `${String(manausDate.getUTCHours()).padStart(2, '0')}:${String(manausDate.getUTCMinutes()).padStart(2, '0')}`;
      }),
    ];

    // Remove duplicatas (caso o mesmo horário esteja ocupado em ambas as tabelas)
    const occupiedSlots = [...new Set(occupiedSlotsArray)];

    console.log(`\n========== HORÁRIOS DISPONÍVEIS - ${dateStr} ==========`);
    console.log(`[available-slots] Horário atual (UTC): ${new Date().toISOString()}`);
    console.log(`[available-slots] Horário atual (Manaus): ${nowManaus.toISOString()}`);
    console.log(`[available-slots] Data solicitada: ${dateStr}`);
    console.log(`[available-slots] É hoje? ${isSameDayManaus(targetDate, nowManaus)}`);
    console.log(`[available-slots] Agendamentos online: ${existingOnlineBookings.length}`);
    console.log(`[available-slots] Atendimentos admin: ${existingAppointments.length}`);
    console.log(`[available-slots] Horários ocupados:`, occupiedSlots);
    console.log(`[available-slots] Tempo mínimo de aviso: ${settings.minimumNotice} horas`);

    // Criar array com todos os horários e seus status
    const slotsWithStatus = allSlots.map((slot) => {
      let isAvailable = true;
      let reason = '';

      // Verifica se está ocupado
      if (occupiedSlots.includes(slot)) {
        isAvailable = false;
        reason = 'occupied';
      }

      // Verifica se está dentro de algum bloqueio
      if (isAvailable) {
        for (const block of scheduleBlocks) {
          if (slot >= block.startTime && slot < block.endTime) {
            isAvailable = false;
            reason = 'blocked';
            break;
          }
        }
      }

      // Se for hoje (no fuso de Manaus), verifica se já passou ou está dentro do tempo mínimo de aviso
      if (isAvailable && isSameDayManaus(targetDate, nowManaus)) {
        const minimumNoticeMs = settings.minimumNotice * 60 * 60 * 1000;
        const minTime = new Date(nowManaus.getTime() + minimumNoticeMs);

        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = createManausDate(dateStr, hours, minutes);

        console.log(`[available-slots] Verificando slot ${slot}:`);
        console.log(`  - Horário atual (Manaus): ${nowManaus.toISOString()}`);
        console.log(`  - Horário do slot: ${slotTime.toISOString()}`);
        console.log(`  - Tempo mínimo necessário: ${minTime.toISOString()}`);

        if (slotTime < minTime) {
          isAvailable = false;
          reason = 'past';
          console.log(`  - Status: INDISPONÍVEL (já passou ou muito próximo)`);
        } else {
          console.log(`  - Status: DISPONÍVEL`);
        }
      }

      return {
        time: slot,
        available: isAvailable,
        reason,
      };
    });

    return NextResponse.json({ slots: slotsWithStatus });
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar horários disponíveis' },
      { status: 500 }
    );
  }
}
