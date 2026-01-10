import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar barbeiro pelo email
    const barber = await prisma.barber.findUnique({
      where: { email },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (!barber.isActive) {
      return NextResponse.json(
        { error: 'Sua conta está inativa. Entre em contato com o administrador.' },
        { status: 403 }
      );
    }

    // Verificar se o barbeiro tem senha configurada
    if (!barber.password) {
      return NextResponse.json(
        { error: 'Senha não configurada. Entre em contato com o administrador.' },
        { status: 403 }
      );
    }

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, barber.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        barberId: barber.id,
        email: barber.email,
        name: barber.name,
        type: 'barber',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retornar informações do barbeiro (sem senha)
    return NextResponse.json({
      token,
      barber: {
        id: barber.id,
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        commissionRate: barber.commissionRate,
      },
    });
  } catch (error) {
    console.error('Erro no login do barbeiro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
