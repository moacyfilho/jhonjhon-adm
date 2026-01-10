import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';

interface JWTPayload {
  barberId: string;
  type: string;
}

function verifyBarberToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.type !== 'barber') {
      return null;
    }
    return decoded.barberId;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const barberId = verifyBarberToken(request);
    
    if (!barberId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      barberId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const commissions = await prisma.commission.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            client: {
              select: {
                name: true,
                phone: true,
              },
            },
            services: {
              include: {
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(commissions);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar comissões' },
      { status: 500 }
    );
  }
}
