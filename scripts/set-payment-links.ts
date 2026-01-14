
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Setting actual payment links...');

    // Using exact matches to be safe and avoid matching partial names
    const updates = [
        { name: 'Jhonjhon Club Corte', link: 'https://sandbox.asaas.com/c/fk9ya87rpuyw0m22' },
        { name: 'Jhonjhon Club Barba', link: 'https://sandbox.asaas.com/c/ovj7s1yrksyupnag' },
        { name: 'Jhonjhon Club Corte & Barba', link: 'https://sandbox.asaas.com/c/h1fobcvjyf0clmz4' },
    ];

    for (const update of updates) {
        // Update matching exactly the name
        const result = await prisma.plan.updateMany({
            where: {
                name: {
                    equals: update.name,
                    mode: 'insensitive' // Allow casing differences but match the full string
                }
            },
            data: { paymentLink: update.link }
        });

        console.log(`Updated ${result.count} existing plans for "${update.name}"`);
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
