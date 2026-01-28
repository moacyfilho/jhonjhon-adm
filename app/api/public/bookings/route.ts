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
      serviceId,
      barberId,
      scheduledDate,
      isSubscriber: clientDeclaredSubscriber, // Cliente pode declarar se é assinante
      observations,
    } = body;

    // Validações
    if (!clientName || !clientPhone || !serviceId || !scheduledDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientName, clientPhone, serviceId, scheduledDate' },
        { status: 400 }
      );
    }

    // Verificar se o serviço existe e está ativo
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || !service.isActive) {
      return NextResponse.json(
        { error: 'Serviço não encontrado ou inativo' },
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

    // Verificar agendamentos online conflitantes
    const conflictingOnlineBooking = await prisma.onlineBooking.findFirst({
      where: {
        scheduledDate: requestedDateTime,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        ...(barberId ? { barberId } : {}),
      },
    });

    if (conflictingOnlineBooking) {
      return NextResponse.json(
        { 
          error: 'Horário já ocupado por outro agendamento online',
          slot: requestedTimeSlot,
        },
        { status: 409 }
      );
    }

    // Verificar atendimentos admin conflitantes
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        date: requestedDateTime,
        status: {
          not: 'CANCELLED',
        },
        ...(barberId ? { barberId } : {}),
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        { 
          error: 'Horário já ocupado por um atendimento',
          slot: requestedTimeSlot,
        },
        { status: 409 }
      );
    }

    console.log(`[bookings] Horário ${requestedTimeSlot} disponível para agendamento`);

    // Verificar se já existe um cliente com este telefone
    let client = await prisma.client.findFirst({
      where: { phone: clientPhone },
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
        serviceId,
        barberId: barberId || null,
        scheduledDate: requestedDateTime, // Usa o Date já criado sem conversão
        isSubscriber,
        observations,
        status: 'PENDING',
      },
      include: {
        service: true,
        barber: true,
        client: true,
      },
    });

    // Enviar notificações WhatsApp (não aguardar para não bloquear a resposta)
    console.log(`\ud83d\udce7 Enviando notificações WhatsApp para agendamento ${booking.id}...`);
    
    sendBookingNotifications({
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.service.name,
      servicePrice: booking.service.price,
      barberName: booking.barber?.name,
      scheduledDate: booking.scheduledDate,
      bookingId: booking.id,
    }).then((result) => {
      if (result.clientNotification.success) {
        console.log(`\u2705 Notificação enviada para o cliente`);
      } else {
        console.error(`\u274c Falha ao enviar notificação para o cliente: ${result.clientNotification.error}`);
      }
      
      if (result.barbershopNotification.success) {
        console.log(`\u2705 Notificação enviada para a barbearia`);
      } else {
        console.error(`\u274c Falha ao enviar notificação para a barbearia: ${result.barbershopNotification.error}`);
      }
    }).catch((error) => {
      console.error(`\u274c Erro ao enviar notificações WhatsApp:`, error);
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agendamento' },
      { status: 500 }
    );
  }
}
