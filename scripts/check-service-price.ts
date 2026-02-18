
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Buscando SERVIÇOS contendo: "foz", "leave", "leavan"`);

    const services = await prisma.service.findMany({
        where: {
            OR: [
                { name: { contains: 'foz', mode: 'insensitive' } },
                { name: { contains: 'leave', mode: 'insensitive' } },
                { name: { contains: 'leavan', mode: 'insensitive' } },
            ]
        }
    });

    if (services.length === 0) {
        console.log('Nenhum serviço encontrado.');
    } else {
        services.forEach(s => {
            console.log(`Serviço: ${s.id} - ${s.name}`);
            console.log(`Price (banco):`, s.price);
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
