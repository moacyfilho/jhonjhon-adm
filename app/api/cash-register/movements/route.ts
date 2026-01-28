import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cashRegisterId, description, amount, category } = body;

    if (!cashRegisterId || !description || amount === undefined || amount <= 0 || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
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

    const movement = await prisma.cashMovement.create({
      data: {
        cashRegisterId,
        type: "EXIT",
        description,
        amount,
        category,
      },
    });

    return NextResponse.json(movement);
  } catch (error) {
    console.error("Error creating cash movement:", error);
    return NextResponse.json(
      { error: "Failed to create cash movement" },
      { status: 500 }
    );
  }
}
