import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar agendamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.onlineBooking.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, observations, barberId, serviceIds, scheduledDate } = body;

    const booking = await prisma.onlineBooking.findUnique({
      where: { id },
      include: { services: true }
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
    if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate);

    // Se houver alteração de serviços, atualizar a tabela associativa
    if (serviceIds && Array.isArray(serviceIds)) {
      // Remover serviços antigos
      await prisma.onlineBookingService.deleteMany({
        where: { onlineBookingId: id }
      });

      // Buscar novos serviços para pegar os preços
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } }
      });

      // Criar novos serviços
      updateData.services = {
        create: services.map(s => ({
          serviceId: s.id,
          price: s.price
        }))
      };
    }

    const updatedBooking = await prisma.onlineBooking.update({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.onlineBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    await prisma.onlineBooking.delete({
      where: { id },
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
