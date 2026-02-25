import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { getManausStartOfDay, getManausEndOfDay } from '@/lib/timezone';

// GET - Listar agendamentos online (autenticado)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    // Filtro por data única (compatibilidade)
    if (date) {
      where.scheduledDate = {
        gte: getManausStartOfDay(date),
        lte: getManausEndOfDay(date),
      };
    }
    // Filtro por período (para agenda visual)
    else if (startDateParam && endDateParam) {
      where.scheduledDate = {
        gte: getManausStartOfDay(startDateParam),
        lte: getManausEndOfDay(endDateParam),
      };
    }

    const bookings = await prisma.onlineBooking.findMany({
      where,
      include: {
        service: true,
        services: {
          include: {
            service: true
          }
        },
        barber: true,
        client: {
          include: {
            subscriptions: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            }
          }
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Para bookings sem clientId, tentar encontrar o cliente pelo telefone
    // (cobre casos onde o booking foi criado antes do cadastro automático ou com formatação diferente)
    const bookingsWithoutClient = bookings.filter(b => !b.clientId && b.clientPhone);

    let clientByNormalizedPhone: Map<string, any> = new Map();

    if (bookingsWithoutClient.length > 0) {
      const rawPhones = bookingsWithoutClient.map(b => b.clientPhone);
      const normalizedPhones = rawPhones.map(p => p.replace(/\D/g, ''));

      // Busca exata por telefone (com e sem formatação)
      const exactMatches = await prisma.client.findMany({
        where: { phone: { in: [...rawPhones, ...normalizedPhones] } },
        include: {
          subscriptions: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } }
        },
      });
      for (const c of exactMatches) {
        clientByNormalizedPhone.set(c.phone.replace(/\D/g, ''), c);
      }

      // Para os que ainda não foram encontrados, buscar pelos últimos 8 dígitos
      const missing = normalizedPhones.filter(p => !clientByNormalizedPhone.has(p));
      for (const phone of missing) {
        if (phone.length < 8) continue;
        const lastDigits = phone.slice(-8);
        const candidates = await prisma.client.findMany({
          where: { phone: { contains: lastDigits } },
          take: 5,
          include: {
            subscriptions: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } }
          },
        });
        const match = candidates.find(c => c.phone.replace(/\D/g, '') === phone);
        if (match) clientByNormalizedPhone.set(phone, match);
      }
    }

    // Injetar cliente encontrado por telefone nos bookings sem clientId
    const result = bookings.map(booking => {
      if (!booking.clientId && booking.clientPhone) {
        const normalizedPhone = booking.clientPhone.replace(/\D/g, '');
        const foundClient = clientByNormalizedPhone.get(normalizedPhone);
        if (foundClient) {
          return { ...booking, client: foundClient };
        }
      }
      return booking;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    );
  }
}
