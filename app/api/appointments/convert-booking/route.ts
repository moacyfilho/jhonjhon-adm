import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { isServiceIncluded } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Converte um OnlineBooking em Appointment
 * Isso é usado quando o usuário edita um agendamento online na agenda visual
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { onlineBookingId, serviceIds, products: productsData, paymentMethod, notes } = body;

    console.log('🟢 [CONVERT-BOOKING] Dados recebidos:', {
      onlineBookingId,
      serviceIds,
      serviceIdsCount: serviceIds?.length || 0,
      productsData,
      productsDataCount: productsData?.length || 0,
      paymentMethod,
      notes,
    });

    if (!onlineBookingId) {
      return NextResponse.json(
        { error: "onlineBookingId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o OnlineBooking
    const onlineBooking = await prisma.onlineBooking.findUnique({
      where: { id: onlineBookingId },
      include: {
        client: true,
        barber: true,
        service: true,
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

    // Determinar quais serviços usar
    const servicesToUse = serviceIds && serviceIds.length > 0
      ? serviceIds
      : [onlineBooking.serviceId];

    // Buscar informações dos serviços
    const services = await prisma.service.findMany({
      where: { id: { in: servicesToUse } },
    });

    if (services.length === 0) {
      return NextResponse.json({ error: "Nenhum serviço válido encontrado" }, { status: 400 });
    }

    // Criar o appointment
    let clientId = onlineBooking.clientId;

    // Se não tem clientId, tentar encontrar pelo telefone antes de criar
    if (!clientId) {
      const existingClient = await prisma.client.findFirst({
        where: { phone: onlineBooking.clientPhone }
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            name: onlineBooking.clientName,
            phone: onlineBooking.clientPhone,
            email: onlineBooking.clientEmail,
          },
        });
        clientId = newClient.id;
      }
    }

    // Verificar se o cliente tem assinatura ativa ou se já estava marcado como assinante no booking
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        clientId: clientId!,
        status: 'ACTIVE',
      },
    });

    const isSubscriptionAppointment = !!activeSubscription || onlineBooking.isSubscriber;

    // Calcular totais e horas trabalhadas
    const servicesData = services.map(service => {
      let price = service.price;
      if (isSubscriptionAppointment) {
        // Se o nome do serviço está contido na descrição dos serviços incluídos, é grátis
        if (isServiceIncluded(activeSubscription?.servicesIncluded, service.name) || onlineBooking.isSubscriber) {
          // Mantemos a isenção se o booking já veio marcado como assinante (fallback)
          // ou se o nome bate com a assinatura atual
          price = 0;
        }
      }

      return {
        id: service.id,
        price,
        duration: service.duration
      };
    });

    const servicesTotal = servicesData.reduce((sum: number, s: any) => sum + s.price, 0);
    const totalDurationMinutes = servicesData.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Calcular total de produtos e agrupar por ID para evitar duplicatas que causariam erro de constraint
    const productMap = new Map<string, { quantity: number, unitPrice: number }>();
    if (productsData && Array.isArray(productsData)) {
      productsData.forEach((item: any) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productMap.set(item.productId, {
            quantity: item.quantity,
            unitPrice: item.unitPrice
          });
        }
      });
    }

    const mergedProducts = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      ...data
    }));

    let productsTotal = 0;
    for (const productItem of mergedProducts) {
      productsTotal += productItem.unitPrice * productItem.quantity;
    }

    const totalAmount = servicesTotal + productsTotal;
    const workedHours = totalDurationMinutes / 60;

    // Calcular comissão
    let commissionAmount = 0;
    if (onlineBooking.barber) {
      if (isSubscriptionAppointment && onlineBooking.barber.hourlyRate) {
        // Para assinantes: usar taxa horária
        commissionAmount = onlineBooking.barber.hourlyRate * workedHours;
      } else {
        // Para clientes normais: usar percentual sobre o valor dos serviços
        commissionAmount = (servicesTotal * onlineBooking.barber.commissionRate) / 100;
      }
    }

    // Buscar todos os produtos de uma vez para validar estoque fora da transação se possível, 
    // ou pelo menos saber se existem.
    const productIds = mergedProducts.map(p => p.productId);
    const dbProducts = productIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];

    // Validar existência e estoque inicial (fora da transação para falhar rápido)
    for (const p of mergedProducts) {
      const dbP = dbProducts.find(item => item.id === p.productId);
      if (!dbP) throw new Error(`Produto não encontrado: ${p.productId}`);
      if (dbP.stock < p.quantity) {
        throw new Error(`Estoque insuficiente para ${dbP.name}. Disponível: ${dbP.stock}, Solicitado: ${p.quantity}`);
      }
    }

    // Criar appointment em transação
    const appointmentResult = await prisma.$transaction(async (tx) => {
      // Re-validar barbeiro (por segurança dentro da transação)
      if (!onlineBooking.barberId) {
        throw new Error("Agendamento online não possui um barbeiro atribuído.");
      }

      // Garantir que paymentMethod seja um valor válido do enum
      const validPaymentMethods = ["CASH", "DEBIT_CARD", "CREDIT_CARD", "PIX"];
      const finalPaymentMethod = (validPaymentMethods.includes(paymentMethod)
        ? paymentMethod
        : "PIX") as any;

      const newAppointment = await tx.appointment.create({
        data: {
          clientId: clientId!,
          barberId: onlineBooking.barberId!,
          date: onlineBooking.scheduledDate,
          totalAmount,
          paymentMethod: finalPaymentMethod,
          observations: notes || onlineBooking.observations,
          status: "SCHEDULED",
          onlineBookingId: onlineBookingId,
          workedHours: isSubscriptionAppointment ? 0 : workedHours,
          workedHoursSubscription: isSubscriptionAppointment ? workedHours : 0,
          isSubscriptionAppointment,
          services: {
            create: servicesData.map((s: any) => ({
              serviceId: s.id,
              price: s.price,
            })),
          },
          products: mergedProducts.length > 0 ? {
            create: mergedProducts.map((productItem) => ({
              productId: productItem.productId,
              quantity: productItem.quantity,
              unitPrice: productItem.unitPrice,
              totalPrice: productItem.unitPrice * productItem.quantity,
            })),
          } : undefined,
        },
      });

      // Atualizar estoque dos produtos
      for (const productItem of mergedProducts) {
        await tx.product.update({
          where: { id: productItem.productId },
          data: {
            stock: {
              decrement: productItem.quantity,
            },
          },
        });
      }

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

      // Atualizar o status do OnlineBooking
      await tx.onlineBooking.update({
        where: { id: onlineBookingId },
        data: { status: "CONFIRMED" },
      });

      return newAppointment;
    }, {
      timeout: 20000 // Timeout de 20s
    });

    return NextResponse.json({
      appointment: appointmentResult,
      message: "Agendamento online convertido com sucesso",
    });
  } catch (error: any) {
    console.error("Error converting online booking:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao converter agendamento online" },
      { status: 500 }
    );
  }
}
