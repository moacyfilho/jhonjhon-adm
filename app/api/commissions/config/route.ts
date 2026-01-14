import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const configs = await prisma.barberServiceCommission.findMany();
        return NextResponse.json(configs);
    } catch (error) {
        console.error("Erro ao buscar configurações de comissão:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Check admin role
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { role: true }
        });

        if (dbUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Requer permissão de administrador" }, { status: 403 });
        }

        const body = await request.json(); // Array de { barberId, serviceId, percentage }

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
        }

        // Usar transação para garantir atomicidade ou apenas loop
        await prisma.$transaction(
            body.map((item) =>
                prisma.barberServiceCommission.upsert({
                    where: {
                        barberId_serviceId: {
                            barberId: item.barberId,
                            serviceId: item.serviceId
                        }
                    },
                    update: { percentage: Number(item.percentage) },
                    create: {
                        barberId: item.barberId,
                        serviceId: item.serviceId,
                        percentage: Number(item.percentage)
                    }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao salvar configurações de comissão:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
