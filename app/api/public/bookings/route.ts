// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendBookingNotifications } from '@/lib/whatsapp';
import { createManausDate } from '@/lib/timezone';

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
    // Precisamos buscar todos os agendamentos do dia para verificar sobreposição
    // Usamos UTC para garantir que pegamos o intervalo correto
    const startOfDay = new Date(requestedDateTime);
    startOfDay.setUTCHours(0, 0, 0, 0); // Início do dia em UTC (aproximado, ideal seria usar helpers de timezone se crítico)

    // Melhor usar uma margem de segurança de +/- 1 dia se não tivermos certeza do timezone exato aqui, 
    // mas vamos confiar que requestedDateTime está correto (Manaus Time).
    // Para simplificar e evitar erros de timezone complexos na query, vamos buscar +/- 12h do horário solicitado
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
      const booking = bookingItem as any;
      const existingStart = new Date(booking.scheduledDate);
      let existingDuration = 0;
      if (booking.services && booking.services.length > 0) {
        existingDuration = booking.services.reduce((sum: number, s: any) => sum + (s.service.duration || 30), 0);
      } else if (booking.service) {
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

    // Verificar Appointments
    for (const appointment of existingAppointments) {
      const existingStart = new Date(appointment.date);
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

    console.log(`[bookings] Horário ${requestedTimeSlot} disponível para agendamento`);

    // Normalizar telefone para busca (apenas números)
    const normalizedPhone = clientPhone.replace(/\D/g, '');

    // Verificar se já existe um cliente com este telefone ou nome
    // A busca é feita por telefone exato, telefone normalizado ou nome identico (insensível a maiúsculas)
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

    // Se o cliente declarou que é assinante, aceitar essa informação
    if (clientDeclaredSubscriber === true) {
      isSubscriber = true;
    }

    if (client) {
      clientId = client.id;

      // Verificar automaticamente se o cliente tem assinatura ativa no banco
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          clientId: client.id,
          status: 'ACTIVE',
        },
      });

      // Se encontrou assinatura ativa, marcar como assinante (sobrescreve declaração)
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
        // Mantemos o serviceId para compatibilidade, usando o primeiro serviço
        serviceId: services[0].id,
        barberId: barberId || null,
        scheduledDate: requestedDateTime, // Usa o Date já criado sem conversão
        isSubscriber,
        observations,
        status: 'PENDING',
        // Cria os registros na tabela associativa
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

    // Enviar notificações WhatsApp (AGUARDAR para garantir envio em Serverless/Netlify)
    const serviceNames = services.map(s => s.name).join(' + ');
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    try {
      const result = await sendBookingNotifications({
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        serviceName: serviceNames,
        servicePrice: totalPrice,
        barberName: booking.barber?.name,
        scheduledDate: booking.scheduledDate,
        bookingId: booking.id,
      });

      if (result.clientNotification.success) {
        console.log(`✅ Notificação enviada para o cliente`);
      } else {
        console.error(`❌ Falha ao enviar notificação para o cliente: ${result.clientNotification.error}`);
      }

      if (result.barbershopNotification.success) {
        console.log(`✅ Notificação enviada para a barbearia`);
      } else {
        console.error(`❌ Falha ao enviar notificação para a barbearia: ${result.barbershopNotification.error}`);
      }
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
