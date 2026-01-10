import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Processar recorrência das assinaturas
// Verifica todas as assinaturas ativas e gera contas a receber para o mês atual/próximo se ainda não existirem
export async function GET(request: NextRequest) {
    try {
        const activeSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
            },
            include: {
                client: true,
            },
        });

        let createdCount = 0;
        const errors: string[] = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        console.log(`[Recorrência] Processando ${activeSubscriptions.length} assinaturas ativas...`);

        for (const subscription of activeSubscriptions) {
            try {
                // Calcular a data de vencimento esperada para este ciclo
                // Se o dia de cobrança já passou este mês, o vencimento é no próximo mês
                // Se ainda não passou, é neste mês

                let targetMonth = currentMonth;
                let targetYear = currentYear;

                // Se hoje é dia 15 e a cobrança é dia 10, já venceu o deste mês (deveria ter sido gerado).
                // Se formos gerar agora, geramos o deste mês (atrasado ou para hoje) ou próximo?
                // Lógica de segurança: Gerar para o mês corrente, independente de já ter passado o dia.
                // Se já tiver passado muito tempo (ex: meses), essa lógica simples só gera o mais recente.
                // Melhor abordagem para "garantir que todos estejam lá":
                // Verificar se existe conta para o mês/ano alvo.

                // Ajuste: A data alvo sempre será o dia de cobrança no mês atual processado.
                const targetDueDate = new Date(currentYear, currentMonth, subscription.billingDay);

                // Se o dia de cobrança nesses mês não existe (ex: 31 de fevereiro), o JS ajusta para o próximo dia válido.
                // Vamos garantir que pegamos o último dia do mês se estourar.
                const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const adjustedDay = Math.min(subscription.billingDay, lastDayOfMonth);
                targetDueDate.setDate(adjustedDay);

                // Verificar se já existe conta a receber para esta assinatura com vencimento neste mês/ano
                const existingAccount = await prisma.accountReceivable.findFirst({
                    where: {
                        subscriptionId: subscription.id,
                        dueDate: {
                            gte: new Date(currentYear, currentMonth, 1),
                            lt: new Date(currentYear, currentMonth + 1, 1),
                        },
                    },
                });

                if (!existingAccount) {
                    console.log(`[Recorrência] Gerando conta para assinatura ${subscription.id} - Cliente ${subscription.client.name} - Vencimento ${targetDueDate.toISOString()}`);

                    await prisma.accountReceivable.create({
                        data: {
                            description: `Assinatura - ${subscription.planName}`,
                            category: 'SUBSCRIPTION',
                            payer: subscription.client.name,
                            clientId: subscription.clientId,
                            phone: subscription.client.phone,
                            amount: subscription.amount,
                            dueDate: targetDueDate,
                            status: targetDueDate < now ? 'OVERDUE' : 'PENDING', // Se já passou a data, cria como Vencido, senão Pendente
                            observations: `Gerado automaticamente via recorrência`,
                            subscriptionId: subscription.id,
                        },
                    });
                    createdCount++;
                }
            } catch (err: any) {
                console.error(`Erro ao processar assinatura ${subscription.id}:`, err);
                errors.push(`Assinatura ${subscription.id}: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: 'Processamento de recorrência concluído',
            processed: activeSubscriptions.length,
            created: createdCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Erro geral na recorrência:', error);
        return NextResponse.json(
            { error: 'Erro ao processar recorrência de assinaturas' },
            { status: 500 }
        );
    }
}
