
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Running emergency migration via GET...');
        const logs = [];

        // Add isExclusive to SubscriptionPlan
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN DEFAULT false;`);
            logs.push('Success: Added isExclusive to SubscriptionPlan');
        } catch (e: any) {
            logs.push(`Note: isExclusive in SubscriptionPlan might already exist (${e.message})`);
        }

        // Add ownerId to SubscriptionPlan
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;`);
            logs.push('Success: Added ownerId to SubscriptionPlan');
        } catch (e: any) {
            logs.push(`Note: ownerId in SubscriptionPlan might already exist (${e.message})`);
        }

        // Add isExclusive to Subscription
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN DEFAULT false;`);
            logs.push('Success: Added isExclusive to Subscription');
        } catch (e: any) {
            logs.push(`Note: isExclusive in Subscription might already exist (${e.message})`);
        }

        return NextResponse.json({
            success: true,
            message: 'Emergency migration executed.',
            logs
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: 'Migration failed', details: error.message },
            { status: 500 }
        );
    }
}
