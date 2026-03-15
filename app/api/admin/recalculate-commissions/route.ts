import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Recalcula comissões de assinantes usando a mesma fórmula do "Resumo por Profissional":
 *   commission = workedHoursSubscription × (receitaTotal / horasTotal) × commissionRate
 *
 * Parâmetros query:
 *   - barberId: (opcional) filtrar por barbeiro
 *   - barberName: (opcional) filtrar por nome do barbeiro
 *   - startDate: (opcional) "YYYY-MM-DD" início do período
 *   - endDate: (opcional) "YYYY-MM-DD" fim do período
 *   - isExclusive: "true" para assinaturas exclusivas (padrão: false = padrão)
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
        const barberName = searchParams.get('barberName');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const dryRun = searchParams.get('dryRun') === 'true';
        const isExclusive = searchParams.get('isExclusive') === 'true';

        // Resolver barberId pelo nome se fornecido
        let resolvedBarberId = barberId;
        if (!resolvedBarberId && barberName) {
            const found = await prisma.barber.findFirst({
                where: { name: { contains: barberName, mode: 'insensitive' } }
            });
            if (!found) {
                return NextResponse.json({ error: `Barbeiro "${barberName}" não encontrado` }, { status: 404 });
            }
            resolvedBarberId = found.id;
        }

        // Montar filtro de data
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(`${startDate}T04:00:00.000Z`);
        if (endDate) dateFilter.lte = new Date(`${endDate}T04:00:00.000Z`);
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // Passo 1: Calcular receita total de assinaturas no período (todos os barbeiros)
        // Buscar receivables pagos de assinatura para calcular a taxa horária efetiva
        const allPaidReceivables = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION',
                status: 'PAID',
                ...(hasDateFilter ? { paymentDate: dateFilter } : {}),
            },
            include: {
                subscription: { select: { isExclusive: true } }
            }
        });

        // Filtrar pelo tipo (exclusiva ou padrão)
        const filteredReceivables = allPaidReceivables.filter(r => {
            const sub = r.subscription as any;
            const subIsExclusive = sub?.isExclusive === true;
            return isExclusive ? subIsExclusive : !subIsExclusive;
        });
        const totalReceivedAmount = filteredReceivables.reduce((sum, r) => sum + Number(r.amount), 0);

        // Passo 2: Calcular total de horas de assinatura no período (todos os barbeiros)
        const allSubAppointments = await prisma.appointment.findMany({
            where: {
                status: 'COMPLETED',
                isSubscriptionAppointment: true,
                ...(hasDateFilter ? { date: dateFilter } : {}),
                client: {
                    subscriptions: {
                        some: { isExclusive: isExclusive, status: 'ACTIVE' } as any
                    }
                }
            },
            select: { workedHoursSubscription: true }
        });
        const totalServiceHours = allSubAppointments.reduce(
            (sum, a) => sum + (Number(a.workedHoursSubscription) || 0), 0
        );

        // Taxa horária efetiva = receita total / horas totais (mesma fórmula do Resumo por Profissional)
        const effectiveHourlyRate = totalServiceHours > 0 ? totalReceivedAmount / totalServiceHours : 0;

        // Passo 3: Buscar atendimentos do barbeiro alvo para recalcular
        const appointments = await prisma.appointment.findMany({
            where: {
                status: 'COMPLETED',
                isSubscriptionAppointment: true,
                ...(resolvedBarberId ? { barberId: resolvedBarberId } : {}),
                ...(hasDateFilter ? { date: dateFilter } : {}),
            },
            include: {
                barber: true,
                commission: true,
                client: { select: { name: true } }
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

            const workedHours = Number(app.workedHoursSubscription) || 0;

            // Comissão = horas do atendimento × taxa horária efetiva × percentual de comissão
            const newCommission = workedHours * effectiveHourlyRate * (barber.commissionRate / 100);
            const oldCommission = Number(app.commission?.amount) || 0;
            const diff = Math.abs(newCommission - oldCommission);

            results.push({
                id: app.id,
                date: app.date,
                barber: barber.name,
                client: (app.client as any).name,
                workedHours,
                effectiveHourlyRate: parseFloat(effectiveHourlyRate.toFixed(4)),
                oldCommission: parseFloat(oldCommission.toFixed(2)),
                newCommission: parseFloat(newCommission.toFixed(2)),
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

        const totalNewCommission = results.reduce((sum, r) => sum + (r.newCommission || 0), 0);

        return NextResponse.json({
            dryRun,
            globalMetrics: {
                totalReceivedAmount: parseFloat(totalReceivedAmount.toFixed(2)),
                totalServiceHours: parseFloat(totalServiceHours.toFixed(4)),
                effectiveHourlyRate: parseFloat(effectiveHourlyRate.toFixed(4)),
            },
            totalAppointments: appointments.length,
            totalNewCommission: parseFloat(totalNewCommission.toFixed(2)),
            totalUpdated: dryRun ? 0 : totalUpdated,
            totalSkipped,
            totalChanges: results.filter(r => r.action === 'updated').length,
            details: results
        });

    } catch (error) {
        console.error('Erro ao recalcular comissões:', error);
        return NextResponse.json({ error: 'Falha ao recalcular comissões' }, { status: 500 });
    }
}

// GET = dryRun automático (simular via navegador)
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    url.searchParams.set('dryRun', 'true');
    const fakeRequest = new Request(url.toString(), { method: 'POST', headers: request.headers });
    return POST(new NextRequest(fakeRequest));
}
