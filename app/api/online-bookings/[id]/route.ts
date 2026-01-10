import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { isServiceIncluded } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET - Buscar agendamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        barber: true,
        client: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agendamento' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar status do agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { status, observations, barberId, paymentMethod, notes } = body;

    const booking = await prisma.onlineBooking.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        barber: true,
        client: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (observations !== undefined) updateData.observations = observations;
    if (barberId !== undefined) updateData.barberId = barberId;

    // Se está finalizando (status = COMPLETED), criar o appointment correspondente com comissão e horas
    if (status === 'COMPLETED' && booking.status !== 'COMPLETED') {
      // Verificar se o cliente tem assinatura ativa
      let clientId: string = booking.clientId || '';

      // Se não tem cliente vinculado, tentar buscar por telefone ou criar novo cliente
      if (!booking.clientId) {
        const existingClient = await prisma.client.findFirst({
          where: { phone: booking.clientPhone },
        });

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Criar novo cliente
          const newClient = await prisma.client.create({
            data: {
              name: booking.clientName,
              phone: booking.clientPhone,
              email: booking.clientEmail || undefined,
            },
          });
          clientId = newClient.id;
        }
      }

      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          clientId,
          status: 'ACTIVE',
        },
      });

      const isSubscriber = !!activeSubscription || booking.isSubscriber;
      const isSubscriptionAppointment = isSubscriber;

      // Calcular o preço final do serviço considerando a assinatura
      let finalServicePrice = booking.service.price;
      if (isSubscriptionAppointment) {
        // Se o nome do serviço está incluído ou se foi marcado como subscriber no booking original (fallback)
        if (isServiceIncluded(activeSubscription?.servicesIncluded, booking.service.name) || booking.isSubscriber) {
          finalServicePrice = 0;
        }
      }

      // Calcular horas trabalhadas
      const workedHours = (booking.service?.duration || 0) / 60;

      // Calcular comissão
      const barber = booking.barberId ? await prisma.barber.findUnique({
        where: { id: booking.barberId },
      }) : null;

      let commissionAmount = 0;
      if (barber) {
        if (isSubscriptionAppointment) {
          commissionAmount = workedHours * (barber.hourlyRate || 0);
        } else {
          commissionAmount = (booking.service.price * (barber.commissionRate || 0)) / 100;
        }
      }

      // Criar appointment correspondente em transação
      await prisma.$transaction(async (tx) => {
        const appointment = await tx.appointment.create({
          data: {
            clientId,
            barberId: booking.barberId!,
            date: booking.scheduledDate,
            totalAmount: finalServicePrice,
            workedHours: isSubscriptionAppointment ? 0 : workedHours,
            workedHoursSubscription: isSubscriptionAppointment ? workedHours : 0,
            isSubscriptionAppointment,
            paymentMethod: paymentMethod || 'CASH',
            observations: notes || booking.observations || undefined,
            status: 'COMPLETED',
            onlineBookingId: params.id,
            services: {
              create: {
                serviceId: booking.serviceId,
                price: finalServicePrice,
              },
            },
          },
        });

        // Criar comissão
        if (commissionAmount > 0 && barber) {
          await tx.commission.create({
            data: {
              appointmentId: appointment.id,
              barberId: barber.id,
              amount: commissionAmount,
              status: 'PENDING',
            },
          });
        }
      });
    }

    const updatedBooking = await prisma.onlineBooking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        service: true,
        barber: true,
        client: true,
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar agendamento' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const booking = await prisma.onlineBooking.findUnique({
      where: { id: params.id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    await prisma.onlineBooking.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir agendamento' },
      { status: 500 }
    );
  }
}
