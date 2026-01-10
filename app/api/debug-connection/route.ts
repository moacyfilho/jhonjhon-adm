
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const count = await prisma.barber.count();
        return NextResponse.json({
            status: 'Connected',
            barberCount: count,
            databaseUrlDefined: !!process.env.DATABASE_URL
        });
    } catch (e) {
        return NextResponse.json({
            status: 'Error',
            error: String(e),
            databaseUrlDefined: !!process.env.DATABASE_URL
        }, { status: 500 });
    }
}
