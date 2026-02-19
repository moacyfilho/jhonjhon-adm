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
    const {
      date,
      barberId,
      status,
      serviceIds,
      serviceItems, // Novo: Array de { serviceId, price }
      productItems,
      paymentMethod,
      notes,
      totalAmount: manualTotalAmount // Novo: Valor final editado manualmente
    } = body;

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
    const isStatusChangingToCompleted = status === 'COMPLETED' && currentAppointment.status !== 'COMPLETED';
    const isBarberChanging = barberId && barberId !== currentAppointment.barberId;
    const areServicesChanging = !!serviceIds || !!serviceItems;
    const areProductsChanging = !!productItems;

    // Recalcular apenas se necessário ou se estiver completando agora
    if (isStatusChangingToCompleted || isBarberChanging || areServicesChanging || areProductsChanging || manualTotalAmount !== undefined) {

      // Prepare services data
      let servicesToCreate: any[] = [];
      let servicesTotal = 0;
      let totalMinutes = 0;

      const allServiceIds = serviceItems
        ? serviceItems.map((s: any) => s.serviceId)
        : (serviceIds || currentAppointment.services.map(s => s.serviceId));

      const dbServices = await prisma.service.findMany({
        where: { id: { in: allServiceIds } }
      });

      if (serviceItems && serviceItems.length > 0) {
        servicesToCreate = serviceItems.map((item: any) => {
          const dbS = dbServices.find(s => s.id === item.serviceId);
          servicesTotal += item.price;
          totalMinutes += dbS?.duration || 0;
          return { serviceId: item.serviceId, price: item.price };
        });
      } else if (serviceIds) {
        servicesToCreate = serviceIds.map((sId: string) => {
          const s = dbServices.find(sv => sv.id === sId);
          const price = s?.price || 0;
          servicesTotal += price;
          totalMinutes += s?.duration || 0;
          return { serviceId: sId, price };
        });
      } else {
        servicesToCreate = currentAppointment.services.map(s => ({
          serviceId: s.serviceId,
          price: s.price
        }));
        servicesTotal = currentAppointment.services.reduce((sum, s) => sum + s.price, 0);
        totalMinutes = currentAppointment.services.reduce((sum, s) => sum + (s.service?.duration || 0), 0);
      }

      // Prepare products data
      let productsToCreate: any[] = [];
      let productsTotal = 0;

      if (areProductsChanging) {
        const productIds = productItems.map((p: any) => p.productId);
        const productDetails = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });
        productsToCreate = productItems.map((item: any) => {
          const prod = productDetails.find(p => p.id === item.productId);
          const unitPrice = item.unitPrice !== undefined ? item.unitPrice : (prod?.price || 0);
          const totalPrice = unitPrice * item.quantity;
          productsTotal += totalPrice;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice
          };
        });
      } else {
        productsToCreate = currentAppointment.products.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice
        }));
        productsTotal = currentAppointment.products.reduce((sum, p) => sum + p.totalPrice, 0);
      }

      // Verificar assinatura
      const isSubscriber = currentAppointment.isSubscriptionAppointment;

      // Final total amount
      if (manualTotalAmount !== undefined && manualTotalAmount !== null) {
        updateData.totalAmount = manualTotalAmount;
      } else if (areServicesChanging || areProductsChanging) {
        if (isSubscriber) {
          // Buscar a assinatura ativa para ver o que está incluso
          const activeSubscription = await prisma.subscription.findFirst({
            where: {
              clientId: currentAppointment.clientId,
              status: 'ACTIVE',
            },
          });

          const servicesIncludedStr = activeSubscription?.servicesIncluded || "";
          const includedServices = servicesIncludedStr
            ? servicesIncludedStr.split(',').map(s => s.trim().toLowerCase())
            : [];

          if (includedServices.length === 0) {
            // Padrão: Corte é isento
            let nonSubscriptionServicesTotal = 0;
            for (const item of servicesToCreate) {
              const dbService = dbServices.find(s => s.id === item.serviceId);
              const isCorte = dbService?.name.toLowerCase().includes('corte');
              if (!isCorte) {
                nonSubscriptionServicesTotal += item.price;
              }
            }
            updateData.totalAmount = nonSubscriptionServicesTotal + productsTotal;
          } else {
            let nonSubscriptionServicesTotal = 0;
            for (const item of servicesToCreate) {
              const dbService = dbServices.find(s => s.id === item.serviceId);
              const isIncluded = includedServices.some(inc =>
                dbService?.name.toLowerCase().includes(inc) || inc === dbService?.id
              );
              if (!isIncluded) {
                nonSubscriptionServicesTotal += item.price;
              }
            }
            updateData.totalAmount = nonSubscriptionServicesTotal + productsTotal;
          }
        } else {
          updateData.totalAmount = servicesTotal + productsTotal;
        }
      }

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
        // Comissão APENAS sobre serviços (produtos excluídos da base de comissão)
        if (isSubscriber) {
          commissionAmount = (workedHours * barber.hourlyRate);
        } else {
          const finalTotalAmount = updateData.totalAmount !== undefined
            ? updateData.totalAmount
            : currentAppointment.totalAmount;
          const commissionBase = Math.max(0, finalTotalAmount - productsTotal);
          commissionAmount = (commissionBase * barber.commissionRate) / 100;
        }
      }

      // Transação para aplicar tudo
      const result = await prisma.$transaction(async (tx) => {
        // Atualizar serviços se mudaram
        if (areServicesChanging) {
          await tx.appointmentService.deleteMany({ where: { appointmentId: id } });
          if (servicesToCreate.length > 0) {
            await tx.appointmentService.createMany({
              data: servicesToCreate.map(s => ({
                appointmentId: id,
                ...s
              }))
            });
          }
        }

        // Atualizar produtos se mudaram
        if (areProductsChanging) {
          // Reverter estoque atual antes de deletar
          for (const oldItem of currentAppointment.products) {
            await tx.product.update({
              where: { id: oldItem.productId },
              data: { stock: { increment: oldItem.quantity } }
            });
          }

          await tx.appointmentProduct.deleteMany({ where: { appointmentId: id } });
          if (productsToCreate.length > 0) {
            await tx.appointmentProduct.createMany({
              data: productsToCreate.map(p => ({
                appointmentId: id,
                ...p
              }))
            });

            // Ajustar estoque novo (apenas se não estiver cancelando)
            // Se estiver cancelando, não debitamos o estoque (pois tecnicamente não saiu)
            const isBecomingCancelled = status === 'CANCELLED' && currentAppointment.status !== 'CANCELLED';

            if (!isBecomingCancelled && status !== 'CANCELLED') {
              for (const item of productsToCreate) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: { decrement: item.quantity } }
                });
              }
            }
          }
        }

        // Se estiver cancelando e NÃO mudou produtos (se mudou, o bloco acima já devolveu o estoque antigo)
        // Precisamos garantir que o estoque volte
        const isBecomingCancelled = status === 'CANCELLED' && currentAppointment.status !== 'CANCELLED';
        if (isBecomingCancelled && !areProductsChanging) {
          for (const oldItem of currentAppointment.products) {
            await tx.product.update({
              where: { id: oldItem.productId },
              data: { stock: { increment: oldItem.quantity } }
            });
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

    // 1. Fetch appointment to check for products and status before deleting
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { products: true }
    });

    if (appointment) {
      // 2. Restore stock if the appointment was valid (not Cancelled)
      // If it was already CANCELLED, stock should have been restored during status change.
      if (appointment.status !== 'CANCELLED') {
        for (const p of appointment.products) {
          await prisma.product.update({
            where: { id: p.productId },
            data: { stock: { increment: p.quantity } }
          });
        }
      }

      // 3. Delete
      await prisma.appointment.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}