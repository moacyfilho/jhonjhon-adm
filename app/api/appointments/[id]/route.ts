import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { date, barberId, status, serviceIds, productItems, paymentMethod, notes } = body;

    // 1. Buscar agendamento atual com todas as relações necessárias
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        services: { include: { service: true } },
        products: true,
        commission: true,
        barber: true
      },
    });

    if (!currentAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 2. Preparar dados de atualização básica
    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (barberId) updateData.barberId = barberId;
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.observations = notes;

    // 3. Lógica de Comissão e Totais
    // Precisamos recalcular se houver mudança em serviços, produtos, barbeiro ou status
    const isStatusChangingToCompleted = status === 'COMPLETED' && currentAppointment.status !== 'COMPLETED';
    const isBarberChanging = barberId && barberId !== currentAppointment.barberId;
    const areServicesChanging = !!serviceIds;
    const areProductsChanging = !!productItems;

    // Recalcular apenas se necessário ou se estiver completando agora
    if (isStatusChangingToCompleted || isBarberChanging || areServicesChanging || areProductsChanging) {

      // Buscar novos serviços ou usar os atuais
      let services = currentAppointment.services.map(s => s.service);
      if (areServicesChanging) {
        services = await prisma.service.findMany({
          where: { id: { in: serviceIds } },
        });
      }

      // Buscar novos produtos ou usar os atuais
      let productDetails = [];
      if (areProductsChanging) {
        const productIds = productItems.map((p: any) => p.productId);
        productDetails = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });
      }

      // Calcular preços
      const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
      let productsTotal = 0;
      if (areProductsChanging) {
        productsTotal = productItems.reduce((sum: number, item: any) => {
          const product = productDetails.find(p => p.id === item.productId);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0);
      } else {
        productsTotal = currentAppointment.products.reduce((sum, p) => sum + p.totalPrice, 0);
      }

      // Verificar assinatura
      const isSubscriber = currentAppointment.isSubscriptionAppointment;

      // Atualizar valores no record
      updateData.totalAmount = isSubscriber ? productsTotal : (servicesTotal + productsTotal);

      const totalMinutes = services.reduce((sum, s) => sum + s.duration, 0);
      const workedHours = totalMinutes / 60;

      if (isSubscriber) {
        updateData.workedHours = 0;
        updateData.workedHoursSubscription = workedHours;
      } else {
        updateData.workedHours = workedHours;
        updateData.workedHoursSubscription = 0;
      }

      // Calcular comissão
      const barber = isBarberChanging
        ? await prisma.barber.findUnique({ where: { id: barberId } })
        : currentAppointment.barber;

      let commissionAmount = 0;
      if (barber) {
        if (isSubscriber) {
          commissionAmount = workedHours * barber.hourlyRate;
        } else {
          commissionAmount = (servicesTotal * barber.commissionRate) / 100;
        }
      }

      // Transação para aplicar tudo
      const result = await prisma.$transaction(async (tx) => {
        // Atualizar serviços se mudaram
        if (areServicesChanging) {
          await tx.appointmentService.deleteMany({ where: { appointmentId: id } });
          if (serviceIds.length > 0) {
            await tx.appointmentService.createMany({
              data: serviceIds.map((sId: string) => ({
                appointmentId: id,
                serviceId: sId,
                price: services.find(sv => sv.id === sId)?.price || 0
              }))
            });
          }
        }

        // Atualizar produtos se mudaram
        if (areProductsChanging) {
          await tx.appointmentProduct.deleteMany({ where: { appointmentId: id } });
          if (productItems.length > 0) {
            await tx.appointmentProduct.createMany({
              data: productItems.map((item: any) => {
                const prod = productDetails.find(p => p.id === item.productId);
                const unitPrice = prod?.price || 0;
                return {
                  appointmentId: id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice,
                  totalPrice: unitPrice * item.quantity
                };
              })
            });

            // Ajustar estoque (isso é simplificado, idealmente compararia diff)
            // Por simplicidade aqui, vamos apenas processar a nova lista
            for (const item of productItems) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } }
              });
            }
          }
        }

        // Lógica de Comissão
        const finalStatus = status || currentAppointment.status;
        if (finalStatus === 'COMPLETED') {
          if (currentAppointment.commission) {
            await tx.commission.update({
              where: { appointmentId: id },
              data: {
                amount: commissionAmount,
                barberId: barber?.id || currentAppointment.barberId
              }
            });
          } else {
            await tx.commission.create({
              data: {
                appointmentId: id,
                barberId: barber?.id || currentAppointment.barberId,
                amount: commissionAmount
              }
            });
          }
        }

        // Atualizar Atendimento
        return await tx.appointment.update({
          where: { id },
          data: updateData,
          include: {
            client: true,
            barber: true,
            services: { include: { service: true } },
            products: { include: { product: true } },
            commission: true
          }
        });
      });

      return NextResponse.json(result);
    }

    // Se nada de especial mudou, apenas update básico
    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        barber: true,
        services: { include: { service: true } },
        products: { include: { product: true } },
        commission: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.appointment.delete({
      where: { id },
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