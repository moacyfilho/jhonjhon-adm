import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const cashRegisters = await prisma.cashRegister.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        movements: true,
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    // Transform to match expected format
    const transformed = cashRegisters.map(cr => ({
      id: cr.id,
      initialAmount: cr.initialAmount,
      finalAmount: cr.finalAmount,
      expectedAmount: cr.expectedAmount,
      difference: cr.difference,
      totalIncome: cr.movements.filter(m => m.type === "ENTRY").reduce((sum, m) => sum + m.amount, 0),
      totalExpense: cr.movements.filter(m => m.type === "EXIT").reduce((sum, m) => sum + m.amount, 0),
      status: cr.status,
      openedAt: cr.openedAt,
      closedAt: cr.closedAt,
      openedBy: cr.user,
      closedBy: null,
      movements: cr.movements,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching cash registers:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash registers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { initialAmount } = body;

    if (initialAmount === undefined || initialAmount < 0) {
      return NextResponse.json(
        { error: "Invalid initial amount" },
        { status: 400 }
      );
    }

    // Check if there's already an open cash register
    const openCashRegister = await prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
    });

    if (openCashRegister) {
      return NextResponse.json(
        { error: "There is already an open cash register" },
        { status: 400 }
      );
    }

    // Sync User: Ensure Prisma user exists
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      // Create user in Prisma if not exists (using Supabase ID if possible, but schema has CUID default)
      // We'll trust the ID from Supabase if we can, or let Prisma gen one.
      // Ideally we want to link them.
      dbUser = await prisma.user.create({
        data: {
          id: user.id, // Try to enforce same ID
          email: user.email,
          name: user.user_metadata.full_name || user.email.split('@')[0],
          role: (user.user_metadata.role as any) || 'SECRETARY',
        }
      });
    }

    const cashRegister = await prisma.cashRegister.create({
      data: {
        initialAmount,
        openedBy: dbUser.id,
        status: "OPEN",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform to match expected format
    const transformed = {
      id: cashRegister.id,
      initialAmount: cashRegister.initialAmount,
      finalAmount: null,
      expectedAmount: null,
      difference: null,
      totalIncome: 0,
      totalExpense: 0,
      status: cashRegister.status,
      openedAt: cashRegister.openedAt,
      closedAt: null,
      openedBy: cashRegister.user,
      closedBy: null,
      movements: [],
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error opening cash register:", error);
    return NextResponse.json(
      { error: "Failed to open cash register" },
      { status: 500 }
    );
  }
}
