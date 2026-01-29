import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const password = "admin123";
        const hash = await bcrypt.hash(password, 10);
        const compare = await bcrypt.compare(password, hash);

        return NextResponse.json({
            status: 'success',
            message: 'Bcrypt is working',
            hashExample: hash.substring(0, 10) + '...',
            compareResult: compare
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
