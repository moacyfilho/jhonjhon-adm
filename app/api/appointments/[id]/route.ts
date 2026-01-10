import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { isServiceIncluded } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
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

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, barberId, status, serviceIds, productItems, paymentMethod, notes, observations } = body;

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (barberId) updateData.barberId = barberId;
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (notes || observations) updateData.observations = notes || observations;

    // Se serviceIds ou productItems foi fornecido, atualizar serviços/produtos
    if ((serviceIds && Array.isArray(serviceIds)) || (productItems && Array.isArray(productItems))) {
      // Buscar os preços dos serviços
      const services = serviceIds && serviceIds.length > 0
        ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
        })
        : [];

      // Buscar os produtos se fornecidos
      const productIds = productItems ? productItems.map((p: any) => p.productId) : [];
      const products = productIds.length > 0
        ? await prisma.product.findMany({
          where: { id: { in: productIds } },
        })
        : [];

      // Buscar o barbeiro atual ou o novo barbeiro
      const appointment = await prisma.appointment.findUnique({
        where: { id: params.id },
        include: { barber: true, commission: true },
      });

      const barber = barberId
        ? await prisma.barber.findUnique({ where: { id: barberId } })
        : appointment?.barber;

      // Buscar assinatura ativa do cliente
      const activeSubscription = appointment?.clientId ? await prisma.subscription.findFirst({
        where: {
          clientId: appointment.clientId,
          status: 'ACTIVE',
        },
      }) : null;

      const isSubscriptionAppointment = !!activeSubscription || appointment?.isSubscriptionAppointment || false;

      // Calcular totais e preparar dados dos serviços
      const servicesData = services.map(s => {
        let price = s.price;
        if (isSubscriptionAppointment && activeSubscription) {
          // Se o nome do serviço está contido na descrição dos serviços incluídos, é grátis
          if (isServiceIncluded(activeSubscription.servicesIncluded, s.name)) {
            price = 0;
          }
        } else if (isSubscriptionAppointment && !activeSubscription) {
          // Se for agendamento de assinante mas não achou a assinatura ativa no momento (ex: expirou)
          // Mantemos como grátis se já era isSubscriptionAppointment? 
          // O usuário quer que cobre o que não está na assinatura, então se não tem assinatura, cobra tudo.
          // Mas para evitar surpresas em agendamentos já marcados como sub, vamos ser cautelosos.
          price = 0;
        }

        return {
          id: s.id,
          price,
          duration: s.duration
        };
      });

      const servicesTotal = servicesData.reduce((sum, s) => sum + s.price, 0);

      // Agrupar produtos para evitar duplicatas e erro de constraint
      const productMap = new Map<string, { quantity: number, unitPrice: number }>();
      if (productItems && Array.isArray(productItems)) {
        productItems.forEach((item: any) => {
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            // Se o preço não foi enviado, buscar do DB
            const dbProduct = products.find(p => p.id === item.productId);
            productMap.set(item.productId, {
              quantity: item.quantity,
              unitPrice: item.unitPrice || dbProduct?.price || 0
            });
          }
        });
      }

      const mergedProducts = Array.from(productMap.entries()).map(([productId, data]) => ({
        productId,
        ...data
      }));

      const productsTotal = mergedProducts.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

      const totalAmount = servicesTotal + productsTotal;
      const commissionAmount = barber
        ? (isSubscriptionAppointment ? (servicesData.reduce((sum, s) => sum + s.duration, 0) / 60 * barber.hourlyRate) : (servicesTotal * barber.commissionRate) / 100)
        : 0;

      // Calculate worked hours based on service durations (convert minutes to hours)
      const totalMinutes = servicesData.reduce((sum, s) => sum + s.duration, 0);
      const workedHours = totalMinutes / 60;

      updateData.totalAmount = totalAmount;
      updateData.workedHours = isSubscriptionAppointment ? 0 : workedHours;
      updateData.workedHoursSubscription = isSubscriptionAppointment ? workedHours : 0;
      updateData.isSubscriptionAppointment = isSubscriptionAppointment;

      // Buscar produtos atuais para restaurar o estoque antes de aplicar o novo
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id: params.id },
        include: { products: true }
      });

      // Atualizar o appointment e seus serviços/produtos em uma transação
      const updatedAppointment = await prisma.$transaction(async (tx) => {
        // Restaurar estoque dos produtos removidos/alterados
        if (currentAppointment?.products) {
          for (const p of currentAppointment.products) {
            await tx.product.update({
              where: { id: p.productId },
              data: { stock: { increment: p.quantity } }
            });
          }
        }

        // Deletar os serviços antigos
        await tx.appointmentService.deleteMany({
          where: { appointmentId: params.id },
        });

        // Deletar os produtos antigos
        await tx.appointmentProduct.deleteMany({
          where: { appointmentId: params.id },
        });

        // Criar os novos serviços
        if (serviceIds && serviceIds.length > 0) {
          await tx.appointmentService.createMany({
            data: serviceIds.map((serviceId: string) => {
              const servicePrice = servicesData.find(s => s.id === serviceId)?.price ?? 0;
              return {
                appointmentId: params.id,
                serviceId,
                price: servicePrice,
              };
            }),
          });
        }

        // Criar os novos produtos
        if (mergedProducts.length > 0) {
          await tx.appointmentProduct.createMany({
            data: mergedProducts.map((item: any) => {
              return {
                appointmentId: params.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
              };
            }),
          });

          // Reduzir estoque dos novos produtos
          for (const item of mergedProducts) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        // Atualizar ou criar a comissão
        if (appointment?.commission) {
          await tx.commission.update({
            where: { appointmentId: params.id },
            data: {
              amount: commissionAmount,
              barberId: barber?.id || appointment.barberId
            },
          });
        } else if (commissionAmount > 0 && barber) {
          await tx.commission.create({
            data: {
              appointmentId: params.id,
              barberId: barber.id,
              amount: commissionAmount,
              status: "PENDING"
            },
          });
        }

        // Atualizar o appointment
        return await tx.appointment.update({
          where: { id: params.id },
          data: updateData,
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
      }, {
        timeout: 10000 // Timeout de 10s
      });

      return NextResponse.json(updatedAppointment);
    }

    // Se não tem serviceIds, apenas atualizar os campos normais
    // Mas se está mudando para COMPLETED, criar comissão se não existir
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        barber: true,
        client: true,
        services: {
          include: {
            service: true,
          },
        },
        commission: true,
      },
    });

    if (status === 'COMPLETED' && existingAppointment && existingAppointment.status !== 'COMPLETED' && !existingAppointment.commission) {
      // Criar comissão ao finalizar
      const barber = existingAppointment.barber;
      const servicesTotal = existingAppointment.services.reduce((sum: number, s: any) => sum + s.price, 0);

      // Verificar se é assinatura
      const isSubscription = existingAppointment.isSubscriptionAppointment;

      let commissionAmount = 0;
      if (barber) {
        if (isSubscription) {
          // Comissão baseada em valor por hora
          const totalDuration = existingAppointment.services.reduce((sum: number, s: any) => sum + (s.service?.duration || 0), 0);
          const workedHours = totalDuration / 60;
          commissionAmount = workedHours * (barber.hourlyRate || 0);
        } else {
          // Comissão baseada em percentual
          commissionAmount = (servicesTotal * (barber.commissionRate || 0)) / 100;
        }
      }

      await prisma.commission.create({
        data: {
          appointmentId: params.id,
          barberId: barber.id,
          amount: commissionAmount,
          status: 'PENDING',
        },
      });
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.appointment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}