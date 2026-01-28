import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Retorna todos os barbeiros ativos
    const barbers = await prisma.barber.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(barbers);
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar barbeiros' },
      { status: 500 }
    );
  }
}
