import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true
            }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json(dbUser);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
