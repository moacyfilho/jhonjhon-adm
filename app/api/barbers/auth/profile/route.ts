import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';

interface JWTPayload {
  barberId: string;
  email: string;
  name: string;
  type: string;
}

export async function GET(request: NextRequest) {
  try {
    // Extrair token do header Authorization
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verificar e decodificar o token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificar se é um token de barbeiro
    if (decoded.type !== 'barber') {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Buscar informações atualizadas do barbeiro
    const barber = await prisma.barber.findUnique({
      where: { id: decoded.barberId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        commissionRate: true,
        isActive: true,
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 }
      );
    }

    if (!barber.isActive) {
      return NextResponse.json(
        { error: 'Conta inativa' },
        { status: 403 }
      );
    }

    return NextResponse.json({ barber });
  } catch (error) {
    console.error('Erro ao buscar perfil do barbeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
