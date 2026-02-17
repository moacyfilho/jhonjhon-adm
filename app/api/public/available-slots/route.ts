// @ts-nocheck removed
/* eslint-disable */
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


interface ServiceDuration {
  duration: number | null;
}

interface BookingWithServices {
  scheduledDate: Date | string;
  services: { service: ServiceDuration }[];
  service: ServiceDuration | null;
}

export const dynamic = 'force-dynamic';

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
    const durationParam = searchParams.get('duration');
    const requestedDuration = durationParam ? parseInt(durationParam) : 0;

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
      include: {
        services: {
          include: {
            service: true
          }
        },
        service: true // Inclui serviço legado para fallback
      }
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
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    // Busca bloqueios manuais de horário (ScheduleBlock)
    // Usamos UTC puro aqui porque o ScheduleBlock salva a data como 00:00 UTC
    const startOfDayUTC = new Date(`${dateStr}T00:00:00.00Z`);
    const endOfDayUTC = new Date(`${dateStr}T23:59:59.999Z`);

    const scheduleBlocks = await prisma.scheduleBlock.findMany({
      where: {
        date: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
        ...(barberId ? { barberId } : {}),
      },
    });

    // Identificar quais slots base estão ocupados
    const occupiedSlots = new Set<string>();
    const slotDuration = settings.slotDuration || 30;

    // Função auxiliar para marcar slots como ocupados com base na duração
    const markOccupiedSlots = (startTime: Date, totalDuration: number) => {
      // Ajuste para horário de Manaus para cálculo correto de slots
      const startManaus = toManausTime(startTime);

      // Calcular quantos slots de 30min (ou slotDuration) esse agendamento ocupa
      // Arredonda para cima (ex: 45min ocupa 2 slots de 30min)
      const slotsCount = Math.ceil(totalDuration / slotDuration);

      for (let i = 0; i < slotsCount; i++) {
        // Calcula o horário de cada slot ocupado
        const slotTime = new Date(startManaus.getTime() + (i * slotDuration * 60 * 1000));
        const slotString = `${String(slotTime.getUTCHours()).padStart(2, '0')}:${String(slotTime.getUTCMinutes()).padStart(2, '0')}`;
        occupiedSlots.add(slotString);
      }
    };

    // Processar Agendamentos Online
    existingOnlineBookings.forEach(bookingItem => {
      const booking = bookingItem as unknown as BookingWithServices;
      // Calcula duração: soma dos serviços lista OU serviço legado OU 30min padrão
      let duration = 0;

      if (booking.services && booking.services.length > 0) {
        duration = booking.services.reduce((sum: number, s) => sum + (Number(s.service?.duration) || 30), 0);
      } else if (booking.service) { // Fallback para serviço legado
        duration = booking.service.duration || 30;
      } else {
        duration = 30;
      }

      markOccupiedSlots(booking.scheduledDate, duration);
    });

    // Processar Agendamentos Admin
    existingAppointments.forEach(appointment => {
      // Tenta calcular duração pelos serviços, se não tiver, usa 30min padrão
      // Nota: Appointments podem ter workedHours, mas ideal é usar a soma dos serviços previstos
      const duration = appointment.services.reduce((sum, s) => sum + (s.service.duration || 30), 0) || 30;

      markOccupiedSlots(appointment.date, duration);
    });

    // Processar Bloqueios Manuais (ScheduleBlock)
    scheduleBlocks.forEach(block => {
      // block.startTime e endTime são strings "HH:MM"
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);

      // Calcula duração em minutos
      const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      // Cria a data/hora correta usando o dia consultado e a hora do bloqueio
      const blockStartDateTime = createManausDate(dateStr, startHour, startMin);

      markOccupiedSlots(blockStartDateTime, duration);
    });

    console.log(`\n========== HORÁRIOS DISPONÍVEIS - ${dateStr} ==========`);
    console.log(`[available-slots] Horário atual (UTC): ${new Date().toISOString()}`);
    console.log(`[available-slots] Horário atual (Manaus): ${nowManaus.toISOString()}`);
    console.log(`[available-slots] Data solicitada: ${dateStr}`);
    console.log(`[available-slots] É hoje? ${isSameDayManaus(targetDate, nowManaus)}`);
    console.log(`[available-slots] Agendamentos online: ${existingOnlineBookings.length}`);
    console.log(`[available-slots] Atendimentos admin: ${existingAppointments.length}`);
    console.log(`[available-slots] Slots ocupados (com duração):`, Array.from(occupiedSlots));
    console.log(`[available-slots] Tempo mínimo de aviso: ${settings.minimumNotice} horas`);

    // Criar array com todos os horários e seus status
    const slotsWithStatus = allSlots.map((slot) => {
      let isAvailable = true;
      let reason = '';

      // Verifica se está ocupado
      if (occupiedSlots.has(slot)) {
        isAvailable = false;
        reason = 'occupied';
      }

      // Se a duração solicitada for maior que o slot padrão, verificar slots subsequentes
      if (isAvailable && requestedDuration > slotDuration) {
        const slotsNeeded = Math.ceil(requestedDuration / slotDuration);

        // Encontrar índice atual
        const currentIndex = allSlots.indexOf(slot);
        if (currentIndex === -1) {
          isAvailable = false; // Slot não está na grade oficial!?
        } else {
          // Verificar se existem slots suficientes e se estão livres
          for (let i = 1; i < slotsNeeded; i++) {
            const nextSlotIndex = currentIndex + i;

            // Se não existe mais slot no dia (ex: fim do expediente)
            if (nextSlotIndex >= allSlots.length) {
              isAvailable = false;
              reason = 'duration_exceeds_closing';
              break;
            }

            const nextSlot = allSlots[nextSlotIndex];
            // Verifica se o slot seguinte está ocupado
            if (occupiedSlots.has(nextSlot)) {
              isAvailable = false;
              reason = 'overlap';
              break;
            }

            // Verificar continuidade temporal (se os slots são contíguos)
            // Assumimos que allSlots está ordenado e contíguo conforme slotDuration
            // Mas idealmente checaria se nextSlotTime == currentSlotTime + duration
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
