
import { prisma } from "@/lib/db";

async function verificarHoje() {
    const inicio = new Date('2026-02-18T00:00:00Z');
    const fim = new Date('2026-02-18T23:59:59Z');

    console.log("Busando agendamentos concluídos em 18/02/2026 (UTC)...");

    const agendamentos = await prisma.appointment.findMany({
        where: {
            date: { gte: inicio, lte: fim },
            status: 'COMPLETED'
        },
        include: { client: true }
    });

    console.log(`Encontrados: ${agendamentos.length}`);

    let totalCalculado = 0;
    agendamentos.forEach(a => {
        console.log(`- ${a.client.name}: R$ ${a.totalAmount}`);
        totalCalculado += Number(a.totalAmount);
    });

    console.log(`Total do Dia: R$ ${totalCalculado.toFixed(2)}`);
}

verificarHoje()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
