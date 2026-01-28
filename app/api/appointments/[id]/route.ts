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
    const { date, barberId, status, serviceIds, productItems, paymentMethod } = body;

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (barberId) updateData.barberId = barberId;
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

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
        where: { id },
        include: { barber: true, commission: true },
      });

      const barber = barberId
        ? await prisma.barber.findUnique({ where: { id: barberId } })
        : appointment?.barber;

      // Calcular totais
      const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
      const productsTotal = productItems
        ? productItems.reduce((sum: number, item: any) => {
          const product = products.find(p => p.id === item.productId);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0)
        : 0;

      const totalAmount = servicesTotal + productsTotal;
      const commissionAmount = barber
        ? (servicesTotal * barber.commissionRate) / 100
        : 0;

      // Calculate worked hours based on service durations (convert minutes to hours)
      const totalMinutes = services.reduce((sum, s) => sum + s.duration, 0);
      const workedHours = totalMinutes / 60;

      updateData.totalAmount = totalAmount;
      updateData.workedHours = workedHours;

      // Atualizar o appointment e seus serviços/produtos em uma transação
      const updatedAppointment = await prisma.$transaction(async (tx) => {
        // Deletar os serviços antigos
        await tx.appointmentService.deleteMany({
          where: { appointmentId: id },
        });

        // Deletar os produtos antigos
        await tx.appointmentProduct.deleteMany({
          where: { appointmentId: id },
        });

        // Criar os novos serviços
        if (serviceIds && serviceIds.length > 0) {
          await tx.appointmentService.createMany({
            data: serviceIds.map((serviceId: string) => {
              const service = services.find(s => s.id === serviceId);
              return {
                appointmentId: id,
                serviceId,
                price: service?.price || 0,
              };
            }),
          });
        }

        // Criar os novos produtos
        if (productItems && productItems.length > 0) {
          await tx.appointmentProduct.createMany({
            data: productItems.map((item: any) => {
              const product = products.find(p => p.id === item.productId);
              const unitPrice = product?.price || 0;
              return {
                appointmentId: id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: unitPrice * item.quantity,
              };
            }),
          });

          // Atualizar o estoque dos produtos
          for (const item of productItems) {
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

        // Atualizar ou criar a comissão se houver mudança no valor de serviços
        if (appointment?.commission) {
          await tx.commission.update({
            where: { appointmentId: id },
            data: {
              amount: commissionAmount,
            },
          });
        } else if (commissionAmount > 0 && barber) {
          await tx.commission.create({
            data: {
              appointmentId: id,
              barberId: barber.id,
              amount: commissionAmount,
            },
          });
        }

        // Atualizar o appointment
        return await tx.appointment.update({
          where: { id },
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
      });

      return NextResponse.json(updatedAppointment);
    }

    // Se não tem serviceIds, apenas atualizar os campos normais
    const appointment = await prisma.appointment.update({
      where: { id },
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