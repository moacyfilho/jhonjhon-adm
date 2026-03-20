import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.length < 8) {
      return NextResponse.json({ found: false });
    }

    // Normaliza o telefone removendo espaços, parênteses e hífens
    const normalized = phone.replace(/\D/g, '');

    // Busca o cliente pelo telefone (normalizado ou original)
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { phone: { contains: normalized } },
          { phone: phone },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!client) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email || '',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ found: false });
  }
}
