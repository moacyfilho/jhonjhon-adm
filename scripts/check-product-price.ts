
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Buscando produtos contendo: "foz", "leave", "leavan"`);

    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: 'foz', mode: 'insensitive' } },
                { name: { contains: 'leave', mode: 'insensitive' } },
                { name: { contains: 'leavan', mode: 'insensitive' } },
            ]
        }
    });

    if (products.length === 0) {
        console.log('Nenhum produto encontrado.');
    } else {
        products.forEach(p => {
            console.log(`Produto: ${p.id} - ${p.name}`);
            console.log(`Price (banco):`, p.price);
            console.log(`Tipo do price:`, typeof p.price);
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
