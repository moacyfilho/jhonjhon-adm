import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cashRegisterId, finalAmount } = body;

    if (!cashRegisterId || finalAmount === undefined || finalAmount < 0) {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }

    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
      include: {
        movements: true,
      },
    });

    if (!cashRegister) {
      return NextResponse.json(
        { error: "Cash register not found" },
        { status: 404 }
      );
    }

    if (cashRegister.status !== "OPEN") {
      return NextResponse.json(
        { error: "Cash register is not open" },
        { status: 400 }
      );
    }

    // Get appointments for the day
    const startOfDay = new Date(cashRegister.openedAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(cashRegister.openedAt);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totalIncome = appointments.reduce((sum, app) => sum + app.totalAmount, 0);
    const totalExpense = cashRegister.movements
      .filter(m => m.type === "EXIT")
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = cashRegister.initialAmount + totalIncome - totalExpense;
    const difference = finalAmount - expectedAmount;

    const updatedCashRegister = await prisma.cashRegister.update({
      where: { id: cashRegisterId },
      data: {
        finalAmount,
        expectedAmount,
        difference,
        closedAt: new Date(),
        status: "CLOSED",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        movements: true,
      },
    });

    // Transform to match expected format
    const transformed = {
      id: updatedCashRegister.id,
      initialAmount: updatedCashRegister.initialAmount,
      finalAmount: updatedCashRegister.finalAmount,
      expectedAmount: updatedCashRegister.expectedAmount,
      difference: updatedCashRegister.difference,
      totalIncome,
      totalExpense,
      status: updatedCashRegister.status,
      openedAt: updatedCashRegister.openedAt,
      closedAt: updatedCashRegister.closedAt,
      openedBy: updatedCashRegister.user,
      closedBy: updatedCashRegister.user,
      movements: updatedCashRegister.movements,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error closing cash register:", error);
    return NextResponse.json(
      { error: "Failed to close cash register" },
      { status: 500 }
    );
  }
}
