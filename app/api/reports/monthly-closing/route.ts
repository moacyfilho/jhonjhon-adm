import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // Expecting format YYYY-MM

        let startDate: Date;
        let endDate: Date;

        if (month) {
            const date = parseISO(`${month}-01`);
            startDate = startOfMonth(date);
            endDate = endOfMonth(date);
        } else {
            const now = new Date();
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        // 1. Total Services
        const serviceTotals = await prisma.appointmentService.aggregate({
            where: {
                appointment: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'COMPLETED',
                },
            },
            _sum: {
                price: true,
            },
        });

        // 2. Total Products
        const productTotals = await prisma.appointmentProduct.aggregate({
            where: {
                appointment: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'COMPLETED',
                },
            },
            _sum: {
                totalPrice: true,
            },
        });

        // Also include standalone product sales if any
        const standaloneProductSales = await prisma.productSale.aggregate({
            where: {
                soldAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                totalAmount: true,
            },
        });

        // 3. Total Commissions
        const commissionTotals = await prisma.commission.aggregate({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // Fetch details for tables
        const services = await prisma.appointmentService.findMany({
            where: {
                appointment: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'COMPLETED',
                },
            },
            include: {
                service: true,
                appointment: {
                    include: {
                        client: true,
                        barber: true,
                    },
                },
            },
            orderBy: {
                appointment: {
                    date: 'desc',
                },
            },
        });

        const appointmentProducts = await prisma.appointmentProduct.findMany({
            where: {
                appointment: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: 'COMPLETED',
                },
            },
            include: {
                product: true,
                appointment: {
                    include: {
                        client: true,
                    },
                },
            },
        });

        const standaloneSalesDetails = await prisma.productSale.findMany({
            where: {
                soldAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                product: true,
            },
        });

        // Normalize and combine
        const combinedProducts = [
            ...appointmentProducts.map(p => ({
                id: p.id,
                date: p.appointment.date,
                productName: p.product.name,
                quantity: p.quantity,
                totalPrice: p.totalPrice,
                clientName: p.appointment.client.name,
                type: 'APPOINTMENT'
            })),
            ...standaloneSalesDetails.map(p => ({
                id: p.id,
                date: p.soldAt,
                productName: p.product.name,
                quantity: p.quantity,
                totalPrice: p.totalAmount, // Note: ProductSale uses totalAmount, AppointmentProduct uses totalPrice (schema check confirmed)
                clientName: p.observations || 'Venda Balcão',
                type: 'STANDALONE'
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const commissions = await prisma.commission.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                barber: true,
                appointment: {
                    include: {
                        client: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            summary: {
                servicesTotal: serviceTotals._sum.price || 0,
                productsTotal: (productTotals._sum.totalPrice || 0) + (standaloneProductSales._sum.totalAmount || 0),
                commissionsTotal: commissionTotals._sum.amount || 0,
                netTotal: (serviceTotals._sum.price || 0) + (productTotals._sum.totalPrice || 0) + (standaloneProductSales._sum.totalAmount || 0) - (commissionTotals._sum.amount || 0),
            },
            details: {
                services,
                products: combinedProducts,
                commissions,
            },
            period: {
                start: startDate,
                end: endDate,
            }
        });
    } catch (error) {
        console.error('Erro ao gerar fechamento mensal:', error);
        return NextResponse.json(
            { error: 'Erro ao gerar fechamento mensal' },
            { status: 500 }
        );
    }
}
