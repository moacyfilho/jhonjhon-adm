import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "all") {
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
    const session = await getServerSession(authOptions);
    if (!session) {
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

    const user = session.user as any;
    const cashRegister = await prisma.cashRegister.create({
      data: {
        initialAmount,
        openedBy: user.id,
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
