import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, format } from "date-fns";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date"); // "YYYY-MM-DD" e.g. "2026-02-18"

        let start: Date;
        let end: Date;

        // Manaus é UTC-4: meia-noite de Manaus = 04:00 UTC, fim do dia = próximo dia 03:59:59.999 UTC
        const manausDateOf = (d: Date) =>
            new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

        if (dateParam) {
            // dateParam vem no formato "yyyy-MM-dd" no horário de Manaus
            start = new Date(`${dateParam}T04:00:00.000Z`);
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1); // +24h -1ms
        } else {
            // Padrão: hoje no fuso de Manaus
            const todayManaus = manausDateOf(new Date());
            start = new Date(`${todayManaus}T04:00:00.000Z`);
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        }

        // 1. Fetch Completed Appointments for the day
        const appointments = await prisma.appointment.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
                status: "COMPLETED",
            },
            include: {
                client: {
                    select: {
                        name: true,
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            take: 1,
                            select: { servicesIncluded: true }
                        }
                    }
                },
                barber: { select: { name: true } },
                // isSubscriptionAppointment incluído automaticamente (campo direto do modelo)
                services: {
                    select: {
                        serviceId: true,
                        price: true,
                        service: {
                            select: { name: true }
                        }
                    }
                },
                products: {
                    include: {
                        product: { select: { name: true } },
                    },
                },
            },
            orderBy: {
                date: 'asc',
            }
        });

        // 2. Fetch Product Sales (standalone) for the day
        const productSales = await prisma.productSale.findMany({
            where: {
                soldAt: {
                    gte: start,
                    lte: end,
                },
            },
            include: {
                product: { select: { name: true } },
            },
            orderBy: {
                soldAt: 'asc',
            }
        });

        // --- Processing Data ---

        let totalServices = 0;
        let totalProducts = 0;
        let totalGeneral = 0;

        const servicesList = [];
        const productsList = [];

        // Process Appointments
        for (const app of appointments) {
            // Logic to separate Service Value from Product Value within Appointment Total
            // Appointment.totalAmount is the final charged amount (including discounts)

            const appProductsTotal = app.products.reduce((sum, p) => sum + p.totalPrice, 0);

            // Logic to ensure Total General = Total Services + Total Products
            // We prioritize covering product costs. If Total Amount < Products Total, 
            // it means even products were discounted (or service was free + product discount).

            let finalAppServices = 0;
            let finalAppProducts = 0;

            if (app.totalAmount >= appProductsTotal) {
                finalAppProducts = appProductsTotal;
                finalAppServices = app.totalAmount - appProductsTotal;
            } else {
                // Rare case: total is less than products value
                finalAppServices = 0;
                finalAppProducts = app.totalAmount;
            }

            totalServices += finalAppServices;
            totalProducts += finalAppProducts; // Add adjusted product value for dashboard consistency? 
            // Actually, for "Products Report", usually we want to see the SOLD value.
            // But for "Closing", we want the MONEY that entered.
            // So assuming finalAppProducts is the money attributed to products.

            totalGeneral += app.totalAmount;

            // Add services to list individually
            const totalServicePrices = app.services.reduce((sum, s) => sum + s.price, 0);

            if (app.services.length > 0) {
                // Para assinantes: determinar serviços cobertos pela assinatura em tempo real
                // Isso garante exibição correta mesmo para atendimentos antigos com preços cheios salvos
                let includedServicesForDisplay: string[] = [];
                if (app.isSubscriptionAppointment) {
                    const activeSub = (app.client as any).subscriptions?.[0];
                    const servicesIncludedStr = activeSub?.servicesIncluded || '';
                    if (servicesIncludedStr) {
                        try {
                            const parsed = JSON.parse(servicesIncludedStr);
                            if (parsed?.services && Array.isArray(parsed.services)) {
                                includedServicesForDisplay = parsed.services.map((s: string) => s.trim().toLowerCase());
                            }
                        } catch {
                            includedServicesForDisplay = servicesIncludedStr
                                .split(/[,+]/)
                                .map((s: string) => s.trim().toLowerCase())
                                .filter((s: string) => s.length > 0 && s !== 'null');
                        }
                    }
                }

                app.services.forEach(s => {
                    let serviceAmount = s.price;

                    if (app.isSubscriptionAppointment) {
                        // Assinante: zerar serviços cobertos pela assinatura
                        const svcName = s.service.name.toLowerCase();
                        if (includedServicesForDisplay.length === 0) {
                            // Sem lista específica: padrão é cobrir "corte"
                            serviceAmount = svcName.includes('corte') ? 0 : s.price;
                        } else {
                            const isIncluded = includedServicesForDisplay.some(inc =>
                                svcName.includes(inc) || inc.includes(svcName)
                            );
                            serviceAmount = isIncluded ? 0 : s.price;
                        }
                    } else if (totalServicePrices > 0 && finalAppServices !== totalServicePrices) {
                        // Não-assinante com desconto: aplicar ratio proporcional
                        const ratio = finalAppServices / totalServicePrices;
                        serviceAmount = s.price * ratio;
                    } else if (totalServicePrices === 0 && finalAppServices > 0) {
                        serviceAmount = finalAppServices / app.services.length;
                    }

                    servicesList.push({
                        id: `${app.id}-${s.serviceId}`, // Unique ID for key
                        time: app.date,
                        client: app.client.name,
                        barber: app.barber.name,
                        items: s.service.name, // Individual service name
                        amount: serviceAmount,
                        paymentMethod: app.paymentMethod,
                        type: 'Agendamento'
                    });
                });
            } else if (finalAppServices > 0) {
                // Case: valid amount but no services recorded (e.g. manual charge)
                servicesList.push({
                    id: app.id,
                    time: app.date,
                    client: app.client.name,
                    barber: app.barber.name,
                    items: 'Serviço Avulso',
                    amount: finalAppServices,
                    paymentMethod: app.paymentMethod,
                    type: 'Agendamento'
                });
            }

            // Add products to list with ADJUSTED value if necessary (to match total)
            // If we have multiple products, we distribute the 'finalAppProducts' proportionally or just show as is?
            // For simplicity in this report, we will show the original unit price/total in the list 
            // BUT we should be aware the sum of the list might differ from the summary if we don't adjust.
            // To avoid confusion, let's keep the list showing REAL prices, but the summary showing CLEAN money.
            // OR we adjust the list items. Let's adjust list items if needed.

            const ratio = appProductsTotal > 0 ? finalAppProducts / appProductsTotal : 1;

            app.products.forEach(p => {
                productsList.push({
                    id: `${app.id}-${p.productId}`,
                    time: app.date,
                    client: app.client.name,
                    barber: app.barber.name,
                    product: p.product.name,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    total: p.totalPrice * ratio, // Adjust total to match the money allocation
                    paymentMethod: app.paymentMethod,
                    context: 'Atendimento'
                });
            });
        }

        // Process Standalone Product Sales
        for (const sale of productSales) {
            totalProducts += sale.totalAmount;
            totalGeneral += sale.totalAmount;

            productsList.push({
                id: sale.id,
                time: sale.soldAt,
                client: 'Venda Balcão', // Or sale.soldBy if relevant
                barber: sale.soldBy || '-', // Assuming stored here or null
                product: sale.product.name,
                quantity: sale.quantity,
                unitPrice: sale.unitPrice,
                total: sale.totalAmount,
                paymentMethod: sale.paymentMethod,
                context: 'Venda Avulsa'
            });
        }

        // Sort lists by time
        servicesList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        productsList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return NextResponse.json({
            date: dateParam || start.toISOString(),
            summary: {
                totalServices,
                totalProducts,
                totalGeneral,
            },
            services: servicesList,
            products: productsList,
        });

    } catch (error) {
        console.error("Error creating daily closing report:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
