import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

// Using singleton prisma from lib/db

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log('[Barbers API] GET request started');
  try {
    console.log('[Barbers API] Creating Supabase client...');
    const supabase = createClient();

    console.log('[Barbers API] Getting user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[Barbers API] User:', user?.email, 'Auth Error:', authError);

    if (!user) {
      console.log('[Barbers API] No user, returning 401');
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const barbers = await prisma.barber.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(barbers);
  } catch (error: any) {
    console.error("[Barbers API] ERROR:", error);
    console.error("[Barbers API] Error message:", error?.message);
    console.error("[Barbers API] Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Erro ao buscar barbeiros", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, commissionRate, hourlyRate, subscriptionCommissionRate, isActive } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    const barber = await prisma.barber.create({
      data: {
        name,
        phone,
        email: email || null,
        commissionRate: parseFloat(commissionRate) || 0,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0, // Mantém compatibilidade mas pode ser ignorado na UI
        subscriptionCommissionRate: subscriptionCommissionRate ? parseFloat(subscriptionCommissionRate) : 45,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(barber, { status: 201 });
  } catch (error) {
    console.error("Error creating barber:", error);
    return NextResponse.json(
      { error: "Erro ao criar barbeiro" },
      { status: 500 }
    );
  }
}
