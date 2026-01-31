import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        console.log('--- Iniciando correção de dados via API ---');
        let updatedSubsCount = 0;
        let linkedAccountsCount = 0;
        const details: string[] = [];

        // 1. Corrigir flag isExclusive nas assinaturas
        const exclusiveSubs = await prisma.subscription.findMany({
            where: {
                OR: [
                    { isExclusive: false as any }, // Forçando verificação de campos que deveriam ser true
                    { planName: { contains: 'Exclusiva', mode: 'insensitive' } }
                ]
            },
            include: { client: true }
        });

        for (const sub of exclusiveSubs) {
            if (!(sub as any).isExclusive) {
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: { isExclusive: true } as any
                });
                updatedSubsCount++;
                details.push(`Assinatura ${sub.planName} marcada como exclusiva.`);
            }

            // 2. Vincular contas a receber do cliente à assinatura
            const receivables = await prisma.accountReceivable.findMany({
                where: {
                    clientId: sub.clientId,
                    category: 'SUBSCRIPTION',
                    subscriptionId: null
                }
            });

            for (const rec of receivables) {
                await prisma.accountReceivable.update({
                    where: { id: rec.id },
                    data: { subscriptionId: sub.id }
                });
                linkedAccountsCount++;
                details.push(`Conta "${rec.description}" vinculada à assinatura de ${sub.client.name}.`);
            }
        }

        // 3. Casos onde a descrição diz "Exclusiva" mas não tem clientId (órfãos)
        const orphanReceivables = await prisma.accountReceivable.findMany({
            where: {
                category: 'SUBSCRIPTION',
                subscriptionId: null,
                description: { contains: 'Exclusiva', mode: 'insensitive' }
            }
        });

        for (const rec of orphanReceivables) {
            if (rec.payer) {
                const client = await prisma.client.findFirst({
                    where: { name: { contains: rec.payer, mode: 'insensitive' } },
                    include: { subscriptions: { where: { isExclusive: true } as any } }
                });

                if (client && client.subscriptions.length > 0) {
                    await prisma.accountReceivable.update({
                        where: { id: rec.id },
                        data: {
                            clientId: client.id,
                            subscriptionId: client.subscriptions[0].id
                        }
                    });
                    linkedAccountsCount++;
                    details.push(`Conta órfã de ${rec.payer} vinculada manualmente.`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                updatedSubscriptions: updatedSubsCount,
                linkedFinancialRecords: linkedAccountsCount
            },
            details
        });

    } catch (error: any) {
        console.error('Erro na correção de dados:', error);
        return NextResponse.json({
            error: 'Erro interno ao processar correção',
            details: error.message
        }, { status: 500 });
    }
}
