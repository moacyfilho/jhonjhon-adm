
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        console.log('Running emergency migration...');

        // Add isExclusive to SubscriptionPlan
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN DEFAULT false;`);
            console.log('Added isExclusive to SubscriptionPlan');
        } catch (e: any) {
            console.log('Error adding isExclusive to SubscriptionPlan (maybe exists):', e.message);
        }

        // Add ownerId to SubscriptionPlan
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;`);
            console.log('Added ownerId to SubscriptionPlan');
        } catch (e: any) {
            console.log('Error adding ownerId to SubscriptionPlan (maybe exists):', e.message);
        }

        // Add isExclusive to Subscription
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "isExclusive" BOOLEAN DEFAULT false;`);
            console.log('Added isExclusive to Subscription');
        } catch (e: any) {
            console.log('Error adding isExclusive to Subscription (maybe exists):', e.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Migração de banco de dados executada com sucesso.'
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { error: 'Erro ao migrar banco: ' + error.message },
            { status: 500 }
        );
    }
}
