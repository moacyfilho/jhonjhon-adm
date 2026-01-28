import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

// Using singleton prisma from lib/db

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
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
  } catch (error) {
    console.error("Error fetching barbers:", error);
    return NextResponse.json(
      { error: "Erro ao buscar barbeiros" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, commissionRate, hourlyRate, isActive } = body;

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
        hourlyRate: parseFloat(hourlyRate) || 0,
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
