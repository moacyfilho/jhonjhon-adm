
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const duration = Date.now() - start;
        return NextResponse.json({
            status: 'ok',
            database: 'connected',
            duration: `${duration}ms`,
            env: process.env.NODE_ENV
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        }, { status: 500 });
    }
}
