import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Listar barbeiros disponíveis para agendamento online (API pública)
export async function GET() {
  try {
    // Busca configurações
    const settings = await prisma.bookingSettings.findFirst();

    if (!settings || settings.barberIds.length === 0) {
      return NextResponse.json([]);
    }

    // Retorna apenas barbeiros configurados como disponíveis
    const barbers = await prisma.barber.findMany({
      where: {
        isActive: true,
        id: { in: settings.barberIds },
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
