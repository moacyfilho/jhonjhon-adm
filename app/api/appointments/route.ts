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
    const { clientId, barberId, serviceIds, productItems, date, paymentMethod, notes, onlineBookingId } = body;

    if (!clientId || !barberId || !date || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if ((!serviceIds || serviceIds.length === 0) && (!productItems || productItems.length === 0)) {
      return NextResponse.json(
        { error: "Atendimento deve ter pelo menos um serviço ou produto" },
        { status: 400 }
      );
    }

    // Converter hora local de Manaus (GMT-4) para UTC
    // A string vem como "2026-01-07T09:00:00" (9h local de Manaus)
    // Precisamos salvar como 13:00 UTC (9h + 4h)

    // Parse da string de data/hora
    // Assumir que a hora na string é hora LOCAL de Manaus (não UTC)
    const [datePart, timePart] = date.split('T');
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const appointmentDate = createManausDate(datePart, hours, minutes);

    console.log('[Appointments API] Conversão de timezone:', {
      dateReceived: date,
      datePart,
      timePart,
      hoursManaus: hours,
      minutesManaus: minutes,
      appointmentDateUTC: appointmentDate.toISOString(),
      utcHours: appointmentDate.getUTCHours(),
    });

    // Verificar se já existe um agendamento para este barbeiro neste horário
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        date: appointmentDate,
        status: {
          in: ['SCHEDULED', 'COMPLETED'], // Não considerar cancelados
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "Já existe um agendamento para este barbeiro neste horário" },
        { status: 400 }
      );
    }

    // Get services to calculate total
    const services = serviceIds && serviceIds.length > 0
      ? await prisma.service.findMany({
        where: {
          id: {
            in: serviceIds,
          },
        },
      })
      : [];

    // Get products if provided
    const productIds = productItems ? productItems.map((p: any) => p.productId) : [];
    const products = productIds.length > 0
      ? await prisma.product.findMany({
        where: { id: { in: productIds } },
      })
      : [];

    // Check if client has an active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        clientId,
        status: 'ACTIVE',
      },
    });

    const isSubscriptionAppointment = !!activeSubscription;

    // Calculate totals
    const servicesTotal = services.reduce((sum, service) => sum + service.price, 0);
    const productsTotal = productItems
      ? productItems.reduce((sum: number, item: any) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0)
      : 0;

    // If client has active subscription, service is free (R$ 0.00)
    const totalAmount = isSubscriptionAppointment ? productsTotal : (servicesTotal + productsTotal);

    // Calculate worked hours based on service durations (convert minutes to hours)
    const totalMinutes = services.reduce((sum, service) => sum + service.duration, 0);
    const workedHours = totalMinutes / 60;

    // Get barber data
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    // Calculate commission
    // For subscription appointments: pay hourly rate
    // For regular appointments: pay percentage of services total
    let commissionAmount = 0;
    if (barber) {
      if (isSubscriptionAppointment) {
        // Commission based on hourly rate
        commissionAmount = workedHours * barber.hourlyRate;
      } else {
        // Commission based on percentage (only on services, not products)
        commissionAmount = (servicesTotal * barber.commissionRate) / 100;
      }
    }

    // Create appointment with services and products in a transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: {
          clientId,
          barberId,
          date: appointmentDate,
          totalAmount,
          workedHours: isSubscriptionAppointment ? 0 : workedHours,
          workedHoursSubscription: isSubscriptionAppointment ? workedHours : 0,
          isSubscriptionAppointment,
          paymentMethod,
          observations: notes || null,
          status: "SCHEDULED",
          onlineBookingId: onlineBookingId || null,
          services: serviceIds && serviceIds.length > 0 ? {
            create: serviceIds.map((serviceId: string) => {
              const service = services.find(s => s.id === serviceId);
              return {
                serviceId,
                price: service?.price || 0,
              };
            }),
          } : undefined,
          products: productItems && productItems.length > 0 ? {
            create: productItems.map((item: any) => {
              const product = products.find(p => p.id === item.productId);
              const unitPrice = product?.price || 0;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: unitPrice * item.quantity,
              };
            }),
          } : undefined,
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

      // Se for assinante, registrar o uso na tabela de SubscriptionUsage
      if (isSubscriptionAppointment && activeSubscription) {
        if (serviceIds && serviceIds.length > 0) {
          await tx.subscriptionUsage.createMany({
            data: serviceIds.map((serviceId: string) => ({
              subscriptionId: activeSubscription.id,
              serviceId: serviceId,
              date: appointmentDate,
            })),
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
