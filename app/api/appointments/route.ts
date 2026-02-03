import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";
import { createManausDate, getManausStartOfDay, getManausEndOfDay } from "@/lib/timezone";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const barberId = searchParams.get("barberId");
    const clientId = searchParams.get("clientId");
    const paymentMethod = searchParams.get("paymentMethod");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (search) {
      where.OR = [
        { client: { name: { contains: search, mode: "insensitive" } } },
        { barber: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (barberId) {
      where.barberId = barberId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate && endDate) {
      where.date = {
        gte: getManausStartOfDay(startDate),
        lte: getManausEndOfDay(endDate),
      };

      console.log('[Appointments API] Filtro de data (Manaus):', {
        startDate,
        endDate,
        gte: where.date.gte.toISOString(),
        lte: where.date.lte.toISOString(),
      });
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
        commission: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      barberId,
      serviceIds,
      serviceItems, // Novo: Array de { serviceId, price }
      productItems,
      date,
      paymentMethod,
      notes,
      onlineBookingId,
      totalAmount: manualTotalAmount // Novo: Valor final editado manualmente
    } = body;

    if (!clientId || !barberId || !date || (!paymentMethod && !manualTotalAmount)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (((!serviceIds || serviceIds.length === 0) && (!serviceItems || serviceItems.length === 0)) && (!productItems || productItems.length === 0)) {
      return NextResponse.json(
        { error: "Atendimento deve ter pelo menos um serviço ou produto" },
        { status: 400 }
      );
    }

    // Converter hora local de Manaus (GMT-4) para UTC
    const [datePart, timePart] = date.split('T');
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const appointmentDate = createManausDate(datePart, hours, minutes);

    // Verificar se já existe um agendamento para este barbeiro neste horário
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        date: appointmentDate,
        status: {
          in: ['SCHEDULED', 'COMPLETED'],
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "Já existe um agendamento para este barbeiro neste horário" },
        { status: 400 }
      );
    }

    // Prepare services data
    let servicesToCreate: any[] = [];
    let servicesTotal = 0;
    let totalMinutes = 0;

    const allServiceIds = serviceItems
      ? serviceItems.map((s: any) => s.serviceId)
      : (serviceIds || []);

    const dbServices = allServiceIds.length > 0
      ? await prisma.service.findMany({ where: { id: { in: allServiceIds } } })
      : [];

    if (serviceItems && serviceItems.length > 0) {
      servicesToCreate = serviceItems.map((item: any) => {
        const dbService = dbServices.find(s => s.id === item.serviceId);
        servicesTotal += item.price;
        totalMinutes += dbService?.duration || 0;
        return {
          serviceId: item.serviceId,
          price: item.price
        };
      });
    } else if (serviceIds && serviceIds.length > 0) {
      servicesToCreate = serviceIds.map((sId: string) => {
        const s = dbServices.find(service => service.id === sId);
        const price = s?.price || 0;
        servicesTotal += price;
        totalMinutes += s?.duration || 0;
        return {
          serviceId: sId,
          price: price
        };
      });
    }

    // Get products and calculate products total
    const productIds = productItems ? productItems.map((p: any) => p.productId) : [];
    const products = productIds.length > 0
      ? await prisma.product.findMany({
        where: { id: { in: productIds } },
      })
      : [];

    let productsTotal = 0;
    const productsToCreate = productItems ? productItems.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : (product?.price || 0);
      const totalPrice = unitPrice * item.quantity;
      productsTotal += totalPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      };
    }) : [];

    // Check if client has an active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        clientId,
        status: 'ACTIVE',
      },
    });

    const isSubscriptionAppointment = !!activeSubscription;

    // Final total amount: prioritize manual override, then handle subscription, then normal calc
    let finalTotalAmount = 0;
    if (manualTotalAmount !== undefined && manualTotalAmount !== null) {
      finalTotalAmount = manualTotalAmount;
    } else {
      if (isSubscriptionAppointment) {
        // Se for assinante, verificar quais serviços estão cobertos
        // Se servicesIncluded for nulo ou vazio, tratamos como se cobrisse tudo (legado)
        const servicesIncludedStr = activeSubscription.servicesIncluded || "";
        const includedServices = servicesIncludedStr
          ? servicesIncludedStr.split(',').map(s => s.trim().toLowerCase())
          : [];

        if (includedServices.length === 0) {
          // Se não houver serviços listados, assume o padrão: Corte (ou 'corte') é isento
          let nonSubscriptionServicesTotal = 0;
          for (const item of servicesToCreate) {
            const dbService = dbServices.find(s => s.id === item.serviceId);
            const isCorte = dbService?.name.toLowerCase().includes('corte');
            if (!isCorte) {
              nonSubscriptionServicesTotal += item.price;
            }
          }
          finalTotalAmount = nonSubscriptionServicesTotal + productsTotal;
        } else {
          // Cobertura parcial baseada na lista: somar apenas o que NÃO está incluído
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
          finalTotalAmount = nonSubscriptionServicesTotal + productsTotal;
        }
      } else {
        finalTotalAmount = servicesTotal + productsTotal;
      }
    }

    const workedHours = totalMinutes / 60;

    // Get barber data for commission
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    let commissionAmount = 0;
    if (barber) {
      if (isSubscriptionAppointment) {
        commissionAmount = workedHours * barber.hourlyRate;
      } else {
        // Comissão baseada no total de serviços (usando preços customizados)
        commissionAmount = (servicesTotal * barber.commissionRate) / 100;
      }
    }

    // Create appointment
    const appointment = await prisma.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: {
          clientId,
          barberId,
          date: appointmentDate,
          totalAmount: finalTotalAmount,
          workedHours: isSubscriptionAppointment ? 0 : workedHours,
          workedHoursSubscription: isSubscriptionAppointment ? workedHours : 0,
          isSubscriptionAppointment,
          paymentMethod: paymentMethod || 'PIX',
          observations: notes || null,
          status: "SCHEDULED",
          onlineBookingId: onlineBookingId || null,
          services: servicesToCreate.length > 0 ? {
            create: servicesToCreate
          } : undefined,
          products: productsToCreate.length > 0 ? {
            create: productsToCreate
          } : undefined,
        },
        include: {
          client: true,
          barber: true,
          services: { include: { service: true } },
          products: { include: { product: true } },
        },
      });

      // Se for assinante, registrar o uso na tabela de SubscriptionUsage
      if (isSubscriptionAppointment && activeSubscription) {
        if (allServiceIds.length > 0) {
          await tx.subscriptionUsage.createMany({
            data: allServiceIds.map((serviceId: string) => {
              const service = dbServices.find(s => s.id === serviceId);
              return {
                subscriptionId: activeSubscription.id,
                serviceDetails: service ? service.name : `Service ID: ${serviceId}`,
                usedDate: appointmentDate,
              };
            }),
          });
        }
      }

      // Update product stock
      if (productItems && productItems.length > 0) {
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

      // Não criar comissão na criação do agendamento
      // A comissão será criada quando o atendimento for finalizado (status = COMPLETED)

      return newAppointment;
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
