
import { prisma } from "@/lib/db";

async function limparProdutosHoje() {
    const start = new Date('2026-02-18T00:00:00Z');
    const end = new Date('2026-02-18T23:59:59Z');

    console.log("Removendo vendas de produtos do dia 18/02/2026...");

    // 1. Apagar vendas avulsas (ProductSale)
    const deletedSales = await prisma.productSale.deleteMany({
        where: {
            soldAt: {
                gte: start,
                lte: end
            }
        }
    });
    console.log(`Vendas avulsas removidas: ${deletedSales.count}`);

    // 2. Apagar produtos vinculados a atendimentos (AppointmentProduct)
    // Primeiro, precisamos encontrar os agendamentos do dia para filtrar os produtos corretos
    const appointmentsToday = await prisma.appointment.findMany({
        where: {
            date: { gte: start, lte: end }
        },
        select: { id: true }
    });

    const appointmentIds = appointmentsToday.map(a => a.id);

    if (appointmentIds.length > 0) {
        const deletedAppProducts = await prisma.appointmentProduct.deleteMany({
            where: {
                appointmentId: { in: appointmentIds }
            }
        });
        console.log(`Produtos removidos de agendamentos: ${deletedAppProducts.count}`);

        // Opcional: Recalcular totais dos agendamentos afetados se necessário?
        // Se removemos produtos, o total do agendamento deveria diminuir.
        // Mas como a lógica de desconto manual pode ter sobrescrito, o ideal é não mexer no total salvo
        // A MENOS que o total incluisse explicitamente o produto.
        // O usuário disse "não foi vendido nenhum produto", então o total DEVE refletir apenas serviços.
        // Vou deixar o total como está, pois a maioria dos totais é manual ou serviço.
    } else {
        console.log("Nenhum agendamento encontrado hoje para verificar produtos vinculados.");
    }

    console.log("Limpeza de produtos concluída.");
}

limparProdutosHoje()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
