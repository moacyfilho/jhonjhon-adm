import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

// Using singleton prisma from lib/db

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const barber = await prisma.barber.findUnique({
      where: { id: params.id },
      include: {
        appointments: {
          include: {
            client: true,
            services: {
              include: {
                service: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "Barbeiro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(barber);
  } catch (error) {
    console.error("Error fetching barber:", error);
    return NextResponse.json(
      { error: "Erro ao buscar barbeiro" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    const barber = await prisma.barber.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        email: email || null,
        commissionRate: parseFloat(commissionRate) || 0,
        hourlyRate: parseFloat(hourlyRate) || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(barber);
  } catch (error) {
    console.error("Error updating barber:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar barbeiro" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await prisma.barber.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Barbeiro excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting barber:", error);
    return NextResponse.json(
      { error: "Erro ao excluir barbeiro" },
      { status: 500 }
    );
  }
}
