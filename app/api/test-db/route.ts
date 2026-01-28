import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Starting DB Connection Test...");

        // 1. Check Environment Variables
        const envUrl = process.env.DATABASE_URL;
        const nextAuthUrl = process.env.NEXTAUTH_URL;
        const nextAuthSecret = process.env.NEXTAUTH_SECRET;

        const envStatus = {
            DATABASE_URL: envUrl ? (envUrl.includes("supabase") ? "Calculated: Supabase" : "Present") : "MISSING",
            NEXTAUTH_URL: nextAuthUrl || "MISSING",
            NEXTAUTH_SECRET: nextAuthSecret ? "Present" : "MISSING",
        };

        if (!envUrl) {
            throw new Error("Critical: DATABASE_URL is missing in environment variables.");
        }

        // 2. Dynamic Import and Instantiation to catch binary errors
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
            // 3. Attempt Connection
            const userCount = await prisma.user.count();
            await prisma.$disconnect();

            return NextResponse.json({
                status: 'success',
                message: 'Database connection SUCCESSFUL',
                count: userCount,
                envStatus
            });
        } catch (dbError: any) {
            await prisma.$disconnect();
            throw dbError;
        }

    } catch (error: any) {
        console.error('Test DB Critical Error:', error);
        return NextResponse.json({
            status: 'error',
            error_type: error.name,
            message: error.message,
            stack: error.stack,
            env_check: {
                DATABASE_URL: process.env.DATABASE_URL ? "Defined (Hidden for security)" : "UNDEFINED - Please set in Netlify"
            }
        }, { status: 200 }); // Return 200 even on error so we see the JSON
    }
}
