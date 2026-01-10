import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Listar serviços disponíveis para agendamento online (API pública)
export async function GET() {
  try {
    // Busca configurações
    const settings = await prisma.bookingSettings.findFirst();

    if (!settings || settings.serviceIds.length === 0) {
      return NextResponse.json([]);
    }

    // Retorna apenas serviços configurados como disponíveis
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        id: { in: settings.serviceIds },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar serviços' },
      { status: 500 }
    );
  }
}
