import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';

interface JWTPayload {
  barberId: string;
  type: string;
}

// Função auxiliar para verificar token
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

// GET - Listar bloqueios de horário do barbeiro
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      barberId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const blocks = await prisma.scheduleBlock.findMany({
      where: whereClause,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar bloqueios' },
      { status: 500 }
    );
  }
}

// POST - Criar bloqueio de horário
export async function POST(request: NextRequest) {
  try {
    const barberId = verifyBarberToken(request);
    
    if (!barberId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { date, startTime, endTime, reason } = await request.json();

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Data, horário de início e fim são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o horário de fim é depois do início
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'Horário de fim deve ser depois do início' },
        { status: 400 }
      );
    }

    // Verificar conflitos com agendamentos existentes
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: new Date(date + 'T00:00:00'),
          lt: new Date(date + 'T23:59:59'),
        },
      },
    });

    if (existingAppointments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível bloquear este horário pois existem agendamentos confirmados',
          conflicts: existingAppointments.length,
        },
        { status: 409 }
      );
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        barberId,
        date: new Date(date),
        startTime,
        endTime,
        reason,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar bloqueio:', error);
    return NextResponse.json(
      { error: 'Erro ao criar bloqueio' },
      { status: 500 }
    );
  }
}

// DELETE - Remover bloqueio de horário
export async function DELETE(request: NextRequest) {
  try {
    const barberId = verifyBarberToken(request);
    
    if (!barberId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('id');

    if (!blockId) {
      return NextResponse.json(
        { error: 'ID do bloqueio é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o bloqueio pertence ao barbeiro
    const block = await prisma.scheduleBlock.findUnique({
      where: { id: blockId },
    });

    if (!block) {
      return NextResponse.json(
        { error: 'Bloqueio não encontrado' },
        { status: 404 }
      );
    }

    if (block.barberId !== barberId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para remover este bloqueio' },
        { status: 403 }
      );
    }

    await prisma.scheduleBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover bloqueio:', error);
    return NextResponse.json(
      { error: 'Erro ao remover bloqueio' },
      { status: 500 }
    );
  }
}
