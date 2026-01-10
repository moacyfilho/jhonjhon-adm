import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { createManausDate, getManausStartOfDay, getManausEndOfDay } from "@/lib/timezone";
import { isServiceIncluded } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const barberId = searchParams.get("barberId");
    const clientId = searchParams.get("clientId");
    const paymentMethod = searchParams.get("paymentMethod");
    const status = searchParams.get("status");
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

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      // Converter datas para incluir todo o dia em Manaus (GMT-4)
      // Manaus 00:00 = UTC 04:00 do mesmo dia
      // Manaus 23:59 = UTC 03:59 do dia seguinte
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Início do dia em Manaus = 04:00 UTC do mesmo dia
      const startUTC = new Date(startDateObj);
      startUTC.setUTCHours(4, 0, 0, 0);

      // Fim do dia em Manaus = 03:59:59 UTC do dia seguinte
      const endUTC = new Date(endDateObj);
      endUTC.setUTCDate(endUTC.getUTCDate() + 1);
      endUTC.setUTCHours(3, 59, 59, 999);

      console.log('[Appointments API] Filtro de data:', {
        startDate,
        endDate,
        startUTC: startUTC.toISOString(),
        endUTC: endUTC.toISOString(),
      });

      where.date = {
        gte: startUTC,
        lte: endUTC,
      };
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    // Calcular duração total para verificar conflitos com bloqueios
    const servicesToCheck = serviceIds && serviceIds.length > 0
      ? await prisma.service.findMany({
        where: { id: { in: serviceIds } },
      })
      : [];

    // Se não houver serviços (apenas produtos?), duração é 0? Assumir 30min padrão?
    // Regra atual: exige serviço ou produto. Se só produto, não ocupa agenda?
    // Mas a lógica abaixo (linha 181 original) buscava serviços depois. Vamos buscar antes.

    const minutesDuration = servicesToCheck.reduce((sum, s) => sum + s.duration, 0);
    const apptEndTime = new Date(appointmentDate.getTime() + minutesDuration * 60000);

    // Verificar se há bloqueios de horário (ScheduleBlock)
    const dayStart = getManausStartOfDay(datePart);
    const dayEnd = getManausEndOfDay(datePart);

    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        barberId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    const hasBlockConflict = blocks.some(block => {
      // block.startTime e endTime são strings "HH:mm"
      // Converter para Date no dia correto
      const [startH, startM] = block.startTime.split(':').map(Number);
      const [endH, endM] = block.endTime.split(':').map(Number);

      const blockStart = createManausDate(datePart, startH, startM);
      const blockEnd = createManausDate(datePart, endH, endM);

      // (StartA < EndB) && (EndA > StartB)
      return appointmentDate < blockEnd && apptEndTime > blockStart;
    });

    if (hasBlockConflict) {
      return NextResponse.json(
        { error: "Este horário está bloqueado pelo administrador" },
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
    const servicesData = serviceIds && serviceIds.length > 0
      ? serviceIds.map((serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        let price = service?.price || 0;

        if (isSubscriptionAppointment) {
          // Se o nome do serviço está contido na descrição dos serviços incluídos, é grátis
          if (isServiceIncluded(activeSubscription.servicesIncluded, service?.name || "")) {
            price = 0;
          }
        }

        return {
          serviceId,
          price,
          duration: service?.duration || 0
        };
      })
      : [];

    const servicesTotal = servicesData.reduce((sum: number, s: { price: number }) => sum + s.price, 0);
    const productsTotal = productItems
      ? productItems.reduce((sum: number, item: { productId: string, quantity: number }) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0)
      : 0;

    const totalAmount = servicesTotal + productsTotal;

    // Calculate worked hours based on service durations
    const totalMinutes = servicesData.reduce((sum: number, s: { duration: number }) => sum + s.duration, 0);
    const workedHours = totalMinutes / 60;

    // Get barber data
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    // Calculate commission
    let commissionAmount = 0;
    if (barber) {
      if (isSubscriptionAppointment) {
        // Para agendamentos de assinatura, usamos uma lógica mista ou a taxa horária?
        // Geralmente, se há serviços pagos, a comissão é sobre eles? Ou continua sendo taxa horária?
        // O usuário não especificou, mas vamos manter a lógica de taxa horária se for assinante,
        // ou talvez comissão sobre o que foi pago extra?
        // Mantendo o comportamento anterior para assinantes (taxa horária), mas podemos ajustar se necessário.
        commissionAmount = workedHours * barber.hourlyRate;
      } else {
        commissionAmount = (servicesTotal * barber.commissionRate) / 100;
      }
    }

    // Agrupar produtos para evitar duplicatas e erro de constraint
    const productMap = new Map<string, { quantity: number, unitPrice: number }>();
    if (productItems && Array.isArray(productItems)) {
      productItems.forEach((item: { productId: string, quantity: number }) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          const dbProduct = products.find(p => p.id === item.productId);
          productMap.set(item.productId, {
            quantity: item.quantity,
            unitPrice: dbProduct?.price || 0
          });
        }
      });
    }

    const mergedProducts = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      ...data
    }));

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
          services: servicesData.length > 0 ? {
            create: servicesData.map((s: { serviceId: string; price: number }) => ({
              serviceId: s.serviceId,
              price: s.price,
            })),
          } : undefined,
          products: mergedProducts.length > 0 ? {
            create: mergedProducts.map((productItem) => ({
              productId: productItem.productId,
              quantity: productItem.quantity,
              unitPrice: productItem.unitPrice,
              totalPrice: productItem.unitPrice * productItem.quantity,
            })),
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

      // Update product stock
      if (mergedProducts.length > 0) {
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

      // Criar comissão (sempre Criar agora, como PENDING)
      if (commissionAmount > 0 && barber) {
        await tx.commission.create({
          data: {
            appointmentId: newAppointment.id,
            barberId: barber.id,
            amount: commissionAmount,
            status: "PENDING",
          },
        });
      }

      return newAppointment;
    }, {
      timeout: 10000 // Timeout de 10s
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
