/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendBookingNotifications } from '@/lib/whatsapp';
import { createManausDate } from '@/lib/timezone';

interface ServiceDuration {
  duration: number | null;
}

interface BookingWithServices {
  scheduledDate: Date | string;
  services: { service: ServiceDuration }[];
  service: ServiceDuration | null;
}


// POST - Criar agendamento online (API pública)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      clientEmail,
      serviceIds, // Agora aceita array de IDs
      serviceId, // Mantido para compatibilidade (se vier apenas um)
      barberId,
      scheduledDate,
      isSubscriber: clientDeclaredSubscriber, // Cliente pode declarar se é assinante
      observations,
    } = body;

    // Normaliza para array de IDs
    const targetServiceIds: string[] = Array.isArray(serviceIds)
      ? serviceIds
      : (serviceId ? [serviceId] : []);

    // Validações
    if (!clientName || !clientPhone || targetServiceIds.length === 0 || !scheduledDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientName, clientPhone, serviceIds (pelo menos um), scheduledDate' },
        { status: 400 }
      );
    }

    // Verificar se os serviços existem e estão ativos
    const services = await prisma.service.findMany({
      where: {
        id: { in: targetServiceIds },
        isActive: true,
      },
    });

    if (services.length !== targetServiceIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais serviços não encontrados ou inativos' },
        { status: 404 }
      );
    }

    // Se barbeiro foi especificado, verificar se existe e está ativo
    if (barberId) {
      const barber = await prisma.barber.findUnique({
        where: { id: barberId },
      });

      if (!barber || !barber.isActive) {
        return NextResponse.json(
          { error: 'Barbeiro não encontrado ou inativo' },
          { status: 404 }
        );
      }
    }

    // === VALIDAÇÃO DE HORÁRIO DISPONÍVEL ===
    // Extrai componentes da data/hora da string (formato: "2026-01-06T18:00:00")
    const [datePart, timePart] = scheduledDate.split('T');
    const [hourStr, minuteStr] = timePart.split(':');

    const requestedHour = parseInt(hourStr);
    const requestedMinute = parseInt(minuteStr);

    // Cria Date considerando horário de Manaus (GMT-4)
    // Exemplo: Cliente seleciona 18:00 em Manaus → será salvo como 22:00 UTC
    const requestedDateTime = createManausDate(datePart, requestedHour, requestedMinute);
    const requestedTimeSlot = `${String(requestedHour).padStart(2, '0')}:${String(requestedMinute).padStart(2, '0')}`;

    console.log(`[bookings] Data/hora recebida: ${scheduledDate}`);
    console.log(`[bookings] Data/hora criada (Manaus → UTC): ${requestedDateTime.toISOString()}`);
    console.log(`[bookings] Horário solicitado (local Manaus): ${requestedTimeSlot}`);

    // === VERIFICAÇÃO DE CONFLITOS DE HORÁRIO (COM DURAÇÃO) ===

    // 1. Calcular a duração total dos serviços solicitados
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0) || 30;
    const requestedEndTime = new Date(requestedDateTime.getTime() + totalDuration * 60000); // Adiciona duração em ms

    // 2. Definir janela de busca (Dia inteiro em Manaus)
    const startOfDay = new Date(requestedDateTime);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Busca +/- 12h do horário solicitado
    const searchStart = new Date(requestedDateTime.getTime() - 12 * 60 * 60 * 1000);
    const searchEnd = new Date(requestedDateTime.getTime() + 12 * 60 * 60 * 1000);

    // 3. Buscar agendamentos online existentes no período
    const existingOnlineBookings = await prisma.onlineBooking.findMany({
      where: {
        scheduledDate: {
          gte: searchStart,
          lte: searchEnd,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        ...(barberId ? { barberId } : {}),
      },
      include: {
        services: {
          include: { service: true }
        },
        service: true // Inclui serviço legado para fallback
      }
    });

    // 4. Buscar agendamentos admin existentes no período
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: searchStart,
          lte: searchEnd,
        },
        status: {
          not: 'CANCELLED',
        },
        ...(barberId ? { barberId } : {}),
      },
      include: {
        services: {
          include: { service: true }
        }
      }
    });

    // 5. Verificar sobreposição
    let conflictFound = false;

    // Verificar OnlineBookings
    for (const bookingItem of existingOnlineBookings) {
      // Tipagem explícita a partir da interface
      const booking = bookingItem as unknown as BookingWithServices;

      const existingStart = new Date(booking.scheduledDate);
      let existingDuration = 0;

      if (booking.services && booking.services.length > 0) {
        existingDuration = booking.services.reduce((sum: number, s) => sum + (Number(s.service?.duration) || 30), 0);
      } else if (booking.service) { // Fallback para serviço legado
        existingDuration = booking.service.duration || 30;
      } else {
        existingDuration = 30;
      }

      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

      // Lógica de colisão de intervalos: (StartA < EndB) && (EndA > StartB)
      if (requestedDateTime < existingEnd && requestedEndTime > existingStart) {
        conflictFound = true;
        break;
      }
    }

    if (conflictFound) {
      return NextResponse.json(
        {
          error: 'Horário já ocupado por outro agendamento online (conflito de horário)',
          slot: requestedTimeSlot,
        },
        { status: 409 }
      );
    }

    // Verificar Appointments (admin)
    for (const appointment of existingAppointments) {
      const existingStart = new Date(appointment.date);
      // Tipagem explícita para reduce também aqui, se necessário, mas appointments suele ser bem tipado pelo PrismaClient std
      const existingDuration = appointment.services.reduce((sum, s) => sum + (s.service.duration || 30), 0) || 30;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

      if (requestedDateTime < existingEnd && requestedEndTime > existingStart) {
        conflictFound = true;
        break;
      }
    }


    if (conflictFound) {
      return NextResponse.json(
        {
          error: 'Horário já ocupado por um atendimento (conflito de horário)',
          slot: requestedTimeSlot,
        },
        { status: 409 }
      );
    }

    // Verificar Schedule Blocks
    // ScheduleBlock usa data UTC pura (00:00:00.000Z), então precisamos buscar o dia inteiro UTC
    // searchStart pode começar DEPOIS de 00:00 UTC (devido ao fuso 12h+), o que perderia o block
    const blockStartUTC = new Date(`${datePart}T00:00:00.000Z`);
    const blockEndUTC = new Date(`${datePart}T23:59:59.999Z`);

    const existingBlocks = await prisma.scheduleBlock.findMany({
      where: {
        date: {
          gte: blockStartUTC,
          lte: blockEndUTC,
        },
        ...(barberId ? { barberId } : {}),
      },
    });

    for (const block of existingBlocks) {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);

      // Cria a data/hora correta usando o dia consultado
      const blockStart = createManausDate(datePart, startHour, startMin);
      const blockEnd = createManausDate(datePart, endHour, endMin);

      // Lógica de colisão de intervalos
      if (requestedDateTime < blockEnd && requestedEndTime > blockStart) {
        return NextResponse.json(
          {
            error: 'Este horário está bloqueado pelo estabelecimento',
            slot: requestedTimeSlot,
            reason: block.reason
          },
          { status: 409 }
        );
      }
    }

    if (conflictFound) {
      return NextResponse.json(
        {
          error: 'Horário já ocupado por um atendimento (conflito de horário)',
          slot: requestedTimeSlot,
        },
        { status: 409 }
      );
    }

    console.log(`[bookings] Horário ${requestedTimeSlot} disponível para agendamento`);

    // Normalizar telefone para busca (apenas números)
    const normalizedPhone = clientPhone.replace(/\D/g, '');

    // Verificar se já existe um cliente com este telefone ou nome
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { phone: clientPhone },
          { phone: { contains: normalizedPhone } },
          { name: { equals: clientName, mode: 'insensitive' } },
        ]
      },
    });

    let clientId = null;
    let isSubscriber = false;

    if (clientDeclaredSubscriber === true) {
      isSubscriber = true;
    }

    if (client) {
      clientId = client.id;
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          clientId: client.id,
          status: 'ACTIVE',
        },
      });
      if (activeSubscription) {
        isSubscriber = true;
      }
    }

    // Criar agendamento online
    const booking = await prisma.onlineBooking.create({
      data: {
        clientId,
        clientName,
        clientPhone,
        clientEmail,
        serviceId: services[0].id, // Compatibilidade
        barberId: barberId || null,
        scheduledDate: requestedDateTime,
        isSubscriber,
        observations,
        status: 'PENDING',
        services: {
          create: services.map(service => ({
            serviceId: service.id,
            price: service.price
          }))
        }
      },
      include: {
        services: {
          include: {
            service: true
          }
        },
        barber: true,
        client: true,
      },
    });

    // Enviar notificações
    const serviceNames = services.map(s => s.name).join(' + ');
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    /* Vercel/Serverless: await pode ser arriscado se demorar muito, mas aqui é crítico esperar ou usar background job */
    try {
      // Executa envio de notificação
      await sendBookingNotifications({
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        serviceName: serviceNames,
        servicePrice: totalPrice,
        barberName: booking.barber?.name,
        scheduledDate: booking.scheduledDate,
        bookingId: booking.id,
      }).catch(err => console.error('Erro notificacao:', err));

    } catch (error) {
      console.error(`❌ Erro ao enviar notificações WhatsApp:`, error);
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agendamento' },
      { status: 500 }
    );
  }
}
