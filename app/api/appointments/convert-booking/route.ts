import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

/**
 * Converte um OnlineBooking em Appointment
 * Isso é usado quando o usuário edita um agendamento online na agenda visual
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { onlineBookingId } = body;

    if (!onlineBookingId) {
      return NextResponse.json(
        { error: "onlineBookingId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o OnlineBooking com os serviços associados
    const onlineBooking = await prisma.onlineBooking.findUnique({
      where: { id: onlineBookingId },
      include: {
        client: true,
        barber: true,
        service: true,
        services: {
          include: {
            service: true
          }
        }
      },
    });

    if (!onlineBooking) {
      return NextResponse.json(
        { error: "Agendamento online não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já foi convertido
    const existingAppointment = await prisma.appointment.findFirst({
      where: { onlineBookingId: onlineBookingId },
    });

    if (existingAppointment) {
      return NextResponse.json({
        appointment: existingAppointment,
        message: "Agendamento já foi convertido anteriormente",
      });
    }

    // Calcular totais e preparar lista de serviços
    let totalAmount = 0;
    const servicesToCreate: { serviceId: string; price: number }[] = [];

    // Prioridade: usar a lista de múltiplos serviços
    if (onlineBooking.services && onlineBooking.services.length > 0) {
      for (const item of onlineBooking.services) {
        totalAmount += item.price;
        servicesToCreate.push({
          serviceId: item.serviceId,
          price: item.price
        });
      }
    } else if (onlineBooking.service) {
      // Fallback para serviço único (legado)
      totalAmount = onlineBooking.service.price;
      servicesToCreate.push({
        serviceId: onlineBooking.service.id,
        price: onlineBooking.service.price
      });
    } else {
      // Caso de erro: sem serviço nenhum (não deve acontecer se validado)
      return NextResponse.json(
        { error: "Agendamento sem serviços vinculados" },
        { status: 400 }
      );
    }

    const commissionAmount = onlineBooking.barber
      ? (totalAmount * onlineBooking.barber.commissionRate) / 100
      : 0;

    // Criar o appointment
    let clientId = onlineBooking.clientId;

    // Se não tem clientId, criar o cliente
    if (!clientId) {
      const newClient = await prisma.client.create({
        data: {
          name: onlineBooking.clientName,
          phone: onlineBooking.clientPhone,
          email: onlineBooking.clientEmail,
        },
      });
      clientId = newClient.id;
    }

    // Criar appointment em transação
    const appointment = await prisma.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: {
          clientId: clientId!,
          barberId: onlineBooking.barberId!,
          date: onlineBooking.scheduledDate,
          totalAmount,
          paymentMethod: "PIX", // Padrão inicial, pode ser alterado depois
          observations: onlineBooking.observations,
          status: "SCHEDULED", // Status inicial SCHEDULED, não COMPLETED
          onlineBookingId: onlineBookingId,
          services: {
            create: servicesToCreate,
          },
        },
        include: {
          client: true,
          barber: true,
          services: {
            include: {
              service: true,
            },
          },
          products: {
            include: {
              product: true,
            },
          },
        },
      });

      // Criar comissão
      if (commissionAmount > 0) {
        await tx.commission.create({
          data: {
            appointmentId: newAppointment.id,
            barberId: onlineBooking.barberId!,
            amount: commissionAmount,
            status: "PENDING",
          },
        });
      }

      // Atualizar o status do OnlineBooking para CONFIRMED
      await tx.onlineBooking.update({
        where: { id: onlineBookingId },
        data: { status: "CONFIRMED" },
      });

      return newAppointment;
    });

    return NextResponse.json({
      appointment,
      message: "Agendamento online convertido com sucesso",
    });
  } catch (error) {
    console.error("Error converting online booking:", error);
    return NextResponse.json(
      { error: "Failed to convert online booking" },
      { status: 500 }
    );
  }
}
