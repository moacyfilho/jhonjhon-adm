import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Recalcula comissões em lote para atendimentos de assinantes sem assinatura ativa.
 * Parâmetros query:
 *   - barberId: (opcional) filtrar por barbeiro
 *   - startDate: (opcional) "YYYY-MM-DD" início do período
 *   - endDate: (opcional) "YYYY-MM-DD" fim do período
 *   - dryRun: "true" para simular sem salvar (padrão: false)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const barberId = searchParams.get('barberId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const dryRun = searchParams.get('dryRun') === 'true';

        // Montar filtro de data
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(`${startDate}T04:00:00.000Z`);
        if (endDate) dateFilter.lte = new Date(`${endDate}T04:00:00.000Z`);

        // Buscar atendimentos COMPLETED de assinantes
        const appointments = await prisma.appointment.findMany({
            where: {
                status: 'COMPLETED',
                isSubscriptionAppointment: true,
                ...(barberId ? { barberId } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            },
            include: {
                barber: true,
                products: true,
                services: { include: { service: true } },
                commission: true,
                client: {
                    include: {
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            take: 1,
                            select: { servicesIncluded: true }
                        }
                    }
                }
            }
        });

        const results: any[] = [];
        let totalUpdated = 0;
        let totalSkipped = 0;

        for (const app of appointments) {
            const barber = app.barber;
            if (!barber) {
                results.push({ id: app.id, status: 'skipped', reason: 'barbeiro não encontrado' });
                totalSkipped++;
                continue;
            }

            const productsTotal = app.products.reduce((sum, p) => sum + p.totalPrice, 0);
            const activeSub = app.client.subscriptions?.[0];

            let extraServicesTotal = 0;

            if (activeSub) {
                // Assinatura ativa: calcular com base nos serviços extras
                const servicesIncludedStr = activeSub.servicesIncluded || '';
                let includedServices: string[] = [];
                if (servicesIncludedStr) {
                    try {
                        const parsed = JSON.parse(servicesIncludedStr);
                        if (parsed?.services && Array.isArray(parsed.services)) {
                            includedServices = parsed.services.map((s: string) => s.trim().toLowerCase());
                        }
                    } catch {
                        includedServices = servicesIncludedStr.split(/[,+]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                    }
                }
                for (const svc of app.services) {
                    const svcName = svc.service.name.toLowerCase();
                    const isIncluded = includedServices.length === 0
                        ? svcName.includes('corte')
                        : includedServices.some(inc => svcName.includes(inc) || inc.includes(svcName));
                    if (!isIncluded) extraServicesTotal += svc.price;
                }
            } else {
                // Sem assinatura ativa: usa totalAmount como base (corrige comissão R$0)
                extraServicesTotal = Math.max(0, app.totalAmount - productsTotal);
            }

            const workedHours = app.workedHoursSubscription || 0;
            const newCommission = (workedHours * barber.hourlyRate) + (extraServicesTotal * barber.commissionRate / 100);
            const oldCommission = app.commission?.amount ?? 0;

            const diff = Math.abs(newCommission - oldCommission);

            results.push({
                id: app.id,
                date: app.date,
                barber: barber.name,
                client: app.client.name,
                totalAmount: app.totalAmount,
                hasActiveSub: !!activeSub,
                extraServicesTotal,
                oldCommission,
                newCommission,
                diff: parseFloat(diff.toFixed(2)),
                action: diff > 0.01 ? 'updated' : 'unchanged'
            });

            if (diff > 0.01 && !dryRun) {
                if (app.commission) {
                    await prisma.commission.update({
                        where: { appointmentId: app.id },
                        data: { amount: newCommission }
                    });
                } else {
                    await prisma.commission.create({
                        data: {
                            appointmentId: app.id,
                            barberId: barber.id,
                            amount: newCommission,
                            status: 'PENDING'
                        }
                    });
                }
                totalUpdated++;
            } else {
                totalSkipped++;
            }
        }

        return NextResponse.json({
            dryRun,
            totalAppointments: appointments.length,
            totalUpdated: dryRun ? 0 : totalUpdated,
            totalSkipped,
            totalChanges: results.filter(r => r.action === 'updated').length,
            totalDiff: parseFloat(results.reduce((sum, r) => sum + (r.diff || 0), 0).toFixed(2)),
            details: results
        });

    } catch (error) {
        console.error('Erro ao recalcular comissões:', error);
        return NextResponse.json({ error: 'Falha ao recalcular comissões' }, { status: 500 });
    }
}
