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
        const dateParam = searchParams.get("date");

        // Default to today if no date provided
        const date = dateParam ? new Date(dateParam) : new Date();

        // Get start and end of the specified day (in UTC or adjust for timezone if needed, 
        // but assuming date string implies local day start)
        // Using simple ISO strings for Prisma filter
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        // 1. Fetch Completed Appointments for the day
        const appointments = await prisma.appointment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: "COMPLETED",
            },
            include: {
                client: { select: { name: true } },
                barber: { select: { name: true } },
                services: {
                    include: {
                        service: { select: { name: true } },
                    },
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
                    gte: startDate,
                    lte: endDate,
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

            // Add services to list
            if (app.services.length > 0) {
                servicesList.push({
                    id: app.id,
                    time: app.date,
                    client: app.client.name,
                    barber: app.barber.name,
                    items: app.services.map(s => s.service.name).join(", "),
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
            date: date.toISOString(),
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
