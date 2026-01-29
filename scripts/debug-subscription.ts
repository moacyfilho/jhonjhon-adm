
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
});

async function main() {
    const searchName = 'Moacy';
    console.log(`🔍 Diagnóstico Detalhado para: ${searchName}`);

    // 1. Encontrar o cliente
    const client = await prisma.client.findFirst({
        where: { name: { contains: searchName } }
    });

    if (!client) {
        console.log('❌ Cliente não encontrado');
        return;
    }
    console.log(`✅ Cliente: ${client.name} (${client.id})`);

    // 2. Definir datas (Lógica exata da API)
    // Simulando o dia atual (ou o dia que o usuário vê: 29/01/2026)
    const dateParam = '2026-01-29';
    const referenceDate = parseISO(dateParam);
    const startDate = startOfMonth(referenceDate);
    const endDate = endOfMonth(referenceDate);

    console.log(`\n📅 Intervalo de Diagnóstico:`);
    console.log(`   Start Date: ${startDate.toISOString()} (Local/System representation)`);
    console.log(`   End Date:   ${endDate.toISOString()} (Local/System representation)`);

    // 3. Drill-down no AccountReceivable
    console.log('\n🔎 Investigando AccountReceivable passo-a-passo:');

    // Passo A: Recebíveis do cliente (sem filtros extras)
    const allClientReceivables = await prisma.accountReceivable.findMany({
        where: { clientId: client.id }
    });
    console.log(`   (A) Total Recebíveis do Cliente: ${allClientReceivables.length}`);
    allClientReceivables.forEach(r => {
        console.log(`       - ID: ${r.id} | Cat: '${r.category}' | Status: '${r.status}' | PayDate: ${r.paymentDate?.toISOString()} | DueDate: ${r.dueDate.toISOString()}`);
    });

    // Passo B: Filtrar por Categoria 'SUBSCRIPTION'
    const catFiltered = await prisma.accountReceivable.count({
        where: {
            clientId: client.id,
            category: 'SUBSCRIPTION'
        }
    });
    console.log(`   (B) Com Category='SUBSCRIPTION': ${catFiltered}`);

    // Passo C: Filtrar por Status 'PAID'
    const statusFiltered = await prisma.accountReceivable.count({
        where: {
            clientId: client.id,
            category: 'SUBSCRIPTION',
            status: 'PAID'
        }
    });
    console.log(`   (C) Com Status='PAID': ${statusFiltered}`);

    // Passo D: Filtrar por Data de Pagamento (Lógica de Recebidas)
    const dateFiltered = await prisma.accountReceivable.findMany({
        where: {
            clientId: client.id,
            category: 'SUBSCRIPTION',
            status: 'PAID',
            paymentDate: {
                gte: startDate,
                lte: endDate
            }
        }
    });
    console.log(`   (D) Com PaymentDate no intervalo: ${dateFiltered.length}`);

    if (dateFiltered.length === 0 && statusFiltered > 0) {
        console.log('       ⚠️ FALHA NA DATA! O registro existe mas não caiu no filtro de data.');
        const rec = allClientReceivables.find(r => r.category === 'SUBSCRIPTION' && r.status === 'PAID');
        if (rec && rec.paymentDate) {
            console.log(`       Comparando:`);
            console.log(`       Rec PaymentDate: ${rec.paymentDate.toISOString()}`);
            console.log(`       Intervalo Start: ${startDate.toISOString()}`);
            console.log(`       Intervalo End:   ${endDate.toISOString()}`);
        }
    } else if (dateFiltered.length > 0) {
        console.log('       ✅ SUCESSO! Registro encontrado com a query completa.');
    }

    // 4. Drill-down no Appointment
    console.log('\n🔎 Investigando Appointment passo-a-passo:');

    // Passo A: Do cliente
    const clientApts = await prisma.appointment.findMany({
        where: { clientId: client.id },
        orderBy: { date: 'desc' },
        take: 3
    });
    console.log(`   (A) Últimos Agendamentos:`);
    clientApts.forEach(a => {
        console.log(`       - ID: ${a.id} | Date: ${a.date.toISOString()} | Status: '${a.status}' | IsSub: ${a.isSubscriptionAppointment}`);
    });

    // Passo B: Filtrar para Relatório (Data + Status + IsSub)
    const reportApts = await prisma.appointment.findMany({
        where: {
            // Não filtramos por clientId no relatório geral, mas aqui sim pra testar
            clientId: client.id,
            isSubscriptionAppointment: true,
            status: 'COMPLETED',
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });
    console.log(`   (B) Agendamentos válidos para o Relatório: ${reportApts.length}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
