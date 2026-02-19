import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAppointmentReminder } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Cron Job para enviar lembretes de agendamento (1 hora antes)
 * Deve ser executado a cada hora (ex: via Cron-job.org ou GitHub Actions)
 * Endpoint: /api/cron/reminders?secret=SEU_CRON_SECRET
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Autenticação Simples
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const cronSecret = process.env.CRON_SECRET;

        // Se CRON_SECRET não estiver configurado, falha para segurança (ou permite se for desenv?)
        // Melhor exigir configuração.
        if (!cronSecret || secret !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized - Invalid or missing CRON_SECRET' }, { status: 401 });
        }

        // 2. Definir janela de tempo: Próxima hora cheia
        // Exemplo: Se rodar às 14:05, busca agendamentos entre 15:00 e 15:59
        const now = new Date();
        const targetStart = new Date(now);
        targetStart.setHours(targetStart.getHours() + 1);
        targetStart.setMinutes(0, 0, 0); // Começo da próxima hora

        const targetEnd = new Date(targetStart);
        targetEnd.setMinutes(59, 59, 999); // Fim da próxima hora

        console.log(`[Cron] Verificando lembretes para o intervalo: ${targetStart.toISOString()} - ${targetEnd.toISOString()}`);

        // 3. Buscar Appointments (Confirmados/Manuais)
        const appointments = await prisma.appointment.findMany({
            where: {
                date: {
                    gte: targetStart,
                    lte: targetEnd,
                },
                status: {
                    in: ['SCHEDULED'], // Apenas agendados não cancelados/concluídos
                },
            },
            include: {
                client: true,
                barber: true,
                services: { include: { service: true } },
            },
        });

        // 4. Buscar OnlineBookings (Pendentes/Agendados Publicamente não convertidos ainda)
        const onlineBookings = await prisma.onlineBooking.findMany({
            where: {
                scheduledDate: {
                    gte: targetStart,
                    lte: targetEnd,
                },
                status: {
                    in: ['PENDING', 'CONFIRMED'], // Pendentes de aprovação ou já confirmados (se o fluxo permitir)
                },
            },
            include: {
                services: { include: { service: true } },
                service: true,
                barber: true,
            },
        });

        // 5. Enviar Lembretes
        let sentCount = 0;
        const errors: string[] = [];

        // Processar Appointments
        for (const appt of appointments) {
            // Evitar duplicidade se já houver lógica de controle (aqui assumimos execução única por hora)
            if (!appt.client.phone) continue;

            const serviceNames = appt.services.map(s => s.service.name).join(' + ') || 'Serviço Agendado';

            try {
                await sendAppointmentReminder({
                    clientName: appt.client.name,
                    clientPhone: appt.client.phone,
                    serviceName: serviceNames,
                    servicePrice: appt.totalAmount,
                    barberName: appt.barber.name,
                    scheduledDate: appt.date,
                    bookingId: appt.id,
                });
                sentCount++;
            } catch (err: any) {
                console.error(`Erro ao enviar lembrete para appointment ${appt.id}:`, err);
                errors.push(`Appt ${appt.id}: ${err.message}`);
            }
        }

        // Processar OnlineBookings
        // Cuidado para não duplicar se o OnlineBooking já virou Appointment
        // Se virou Appointment, o OnlineBooking geralmente fica como CONFIRMED ou o Appointment tem onlineBookingId.
        // Vamos verificar se existe um Appointment para este OnlineBooking.
        for (const booking of onlineBookings) {
            // Verifica se já existe um appointment derivado deste booking
            const existingAppt = await prisma.appointment.findFirst({
                where: { onlineBookingId: booking.id }
            });

            if (existingAppt) {
                // Já foi processado como Appointment na lista acima (se status for SCHEDULED)
                // Se status for COMPLETED/CANCELLED, não manda.
                // Então ignoramos aqui para evitar duplicidade.
                continue;
            }

            if (!booking.clientPhone) continue;

            // Montar nome dos serviços
            let serviceNames = '';
            if (booking.services && booking.services.length > 0) {
                serviceNames = booking.services.map(s => s.service.name).join(' + ');
            } else if (booking.service) {
                serviceNames = booking.service.name;
            } else {
                serviceNames = 'Serviço Agendado';
            }

            // Calcular preço total estimado (opcional para lembrete)
            const totalPrice = booking.services.reduce((acc, s) => acc + s.price, 0) || booking.service?.price || 0;

            try {
                await sendAppointmentReminder({
                    clientName: booking.clientName,
                    clientPhone: booking.clientPhone,
                    serviceName: serviceNames,
                    servicePrice: totalPrice,
                    barberName: booking.barber?.name || 'Profissional a definir',
                    scheduledDate: booking.scheduledDate,
                    bookingId: booking.id,
                });
                sentCount++;
            } catch (err: any) {
                console.error(`Erro ao enviar lembrete para onlineBooking ${booking.id}:`, err);
                errors.push(`Booking ${booking.id}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            processed: sentCount,
            errors: errors.length > 0 ? errors : undefined,
            window: { start: targetStart, end: targetEnd }
        });

    } catch (error: any) {
        console.error('Erro no Cron de Lembretes:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
