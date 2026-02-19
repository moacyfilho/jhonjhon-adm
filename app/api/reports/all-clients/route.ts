
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        // Buscar clientes com seus agendamentos concluídos
        const clients = await prisma.client.findMany({
            where: {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                appointments: {
                    where: { status: "COMPLETED" },
                    select: {
                        totalAmount: true,
                        products: {
                            select: {
                                totalPrice: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: "asc",
            },
        });

        // Processar totais financeiro para cada cliente
        const reportData = clients.map(client => {
            let totalServices = 0;
            let totalProducts = 0;
            let totalGeneral = 0;

            client.appointments.forEach(app => {
                // Logica similar ao fechamento diario para separar Totais
                const productsValue = app.products.reduce((acc, p) => acc + Number(p.totalPrice), 0);
                const total = Number(app.totalAmount);

                let servicePart = 0;
                let productPart = 0;

                // Se o total pago cobre os produtos
                if (total >= productsValue) {
                    productPart = productsValue;
                    servicePart = total - productsValue;
                } else {
                    // Caso raro (desconto cobriu ate o custo do produto? improvavel, mas...)
                    productPart = total;
                    servicePart = 0;
                }

                totalServices += servicePart;
                totalProducts += productPart;
                totalGeneral += total;
            });

            return {
                id: client.id,
                name: client.name,
                phone: client.phone,
                email: client.email || "-",
                totalServices,
                totalProducts,
                totalGeneral
            };
        });

        return NextResponse.json(reportData);
    } catch (error) {
        console.error("Error generating clients report:", error);
        return NextResponse.json(
            { error: "Erro ao gerar relatório de clientes" },
            { status: 500 }
        );
    }
}
