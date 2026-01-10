import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Buscar o papel do usuário no banco de dados
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true }
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can mark commissions as paid" },
        { status: 403 }
      );
    }

    const commission = await prisma.commission.update({
      where: { id: params.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return NextResponse.json(commission);
  } catch (error) {
    console.error("Error updating commission:", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}
