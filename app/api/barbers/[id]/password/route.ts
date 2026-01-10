import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar o papel do usuário no banco de dados
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true }
    });

    // Apenas admins podem definir senhas
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se o barbeiro existe
    const barber = await prisma.barber.findUnique({
      where: { id: params.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar senha
    await prisma.barber.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'Senha definida com sucesso',
    });
  } catch (error) {
    console.error('Erro ao definir senha:', error);
    return NextResponse.json(
      { error: 'Erro ao definir senha' },
      { status: 500 }
    );
  }
}
