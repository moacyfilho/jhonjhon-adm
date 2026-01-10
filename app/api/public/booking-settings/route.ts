import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Obter configurações públicas para agendamento
export async function GET() {
    try {
        const settings = await prisma.bookingSettings.findFirst();

        if (!settings) {
            return NextResponse.json({
                advanceBookingDays: 30,
                minimumNotice: 2,
                slotDuration: 30,
                schedule: {
                    monday: { enabled: true, slots: [] },
                    tuesday: { enabled: true, slots: [] },
                    wednesday: { enabled: true, slots: [] },
                    thursday: { enabled: true, slots: [] },
                    friday: { enabled: true, slots: [] },
                    saturday: { enabled: false, slots: [] },
                    sunday: { enabled: false, slots: [] },
                }
            });
        }

        // Retorna apenas campos necessários para o público (segurança)
        return NextResponse.json({
            advanceBookingDays: settings.advanceBookingDays,
            minimumNotice: settings.minimumNotice,
            slotDuration: settings.slotDuration,
            schedule: settings.schedule,
        });
    } catch (error) {
        console.error('Erro ao buscar configurações públicas:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar configurações' },
            { status: 500 }
        );
    }
}
