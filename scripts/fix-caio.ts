
import { prisma } from "@/lib/db";

async function fixCaio() {
    const id = 'cmlsa8s2h0001l8093k3zijf3';

    console.log("Iniciando correção de dados para Caio Troy...");

    const app = await prisma.appointment.findUnique({
        where: { id },
        include: { products: true, client: true }
    });

    if (!app) {
        console.log("Agendamento não encontrado.");
        return;
    }

    console.log(`Cliente: ${app.client.name}`);
    console.log(`Valor Atual: R$ ${app.totalAmount}`);

    if (app.products.length > 0) {
        console.log("ATENÇÃO: Agendamento possui produtos. Cancelando correção automática para evitar perda de dados.");
        return;
    }

    const updated = await prisma.appointment.update({
        where: { id },
        data: { totalAmount: 0 }
    });

    console.log(`SUCESSO: Valor do agendamento atualizado para R$ ${updated.totalAmount}`);
}

fixCaio()
    .catch((e) => {
        console.error("Erro ao executar script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
