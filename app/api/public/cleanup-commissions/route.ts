
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting cleanup via API...');

        // 1. Delete all commissions
        const deletedCommissions = await prisma.commission.deleteMany({});

        // 2. Reset worked hours
        const updatedAppointments = await prisma.appointment.updateMany({
            data: {
                workedHours: 0,
                workedHoursSubscription: 0
            }
        });

        return NextResponse.json({
            success: true,
            deletedCommissions: deletedCommissions.count,
            updatedAppointments: updatedAppointments.count
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
