import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Tenta uma query simples
        const userCount = await prisma.user.count();
        const envUrl = process.env.DATABASE_URL;

        // Obscurece a senha para segurança se mostrar na tela
        const safeUrl = envUrl ? envUrl.replace(/:[^:]*@/, ':****@') : 'UNDEFINED';

        return NextResponse.json({
            status: 'success',
            message: 'Database connection working',
            userCount,
            databaseUrlConfigured: !!envUrl,
            maskedUrl: safeUrl
        });
    } catch (error: any) {
        console.error('Test DB Error:', error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack,
            code: error.code,
            meta: error.meta
        }, { status: 500 });
    }
}
