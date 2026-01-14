
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating payment links...');

    const updates = [
        { name: 'Jhonjhon Club Corte', link: 'https://sandbox.asaas.com/c/fk9ya87rpuyw0m22' },
        { name: 'Jhonjhon Club Barba', link: 'https://sandbox.asaas.com/c/ovj7s1yrksyupnag' },
        { name: 'Jhonjhon Club Corte & Barba', link: 'https://sandbox.asaas.com/c/h1fobcvjyf0clmz4' },
    ];

    for (const update of updates) {
        // Determine the partial name to match in the database
        // "Jhonjhon Club Corte" might match "Jhonjhon Club Corte & Barba" if we use contains on 'Corte',
        // so we use specific queries or exact matches if possible.
        // However, the user's plan names in the DB should closely match what they sent.

        // We try to match by name field in Plan table
        try {
            const plan = await prisma.plan.findFirst({
                where: { name: { contains: update.name, mode: 'insensitive' } }
            });

            if (plan) {
                await prisma.plan.update({
                    where: { id: plan.id },
                    data: { paymentLink: update.link }
                });
                console.log(`Updated link for ${plan.name} -> ${update.link}`);
            } else {
                console.error(`Plan not found for update: ${update.name}`);
            }
        } catch (e) {
            console.error(`Error updating ${update.name}:`, e);
        }
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
