
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding Jhon Jhon...');
    const jhon = await prisma.barber.findFirst({
        where: {
            name: { contains: 'Jhon', mode: 'insensitive' }
        }
    });

    if (!jhon) {
        console.error('Barber Jhon Jhon not found!');
        process.exit(1);
    }

    console.log(`Found Jhon Jhon (ID: ${jhon.id})`);

    const plans = [
        {
            id: 'plan-exclusive-corte',
            name: 'Assinatura Exclusiva - Corte',
            description: 'Cortes ilimitados com Jhon Jhon (Exclusivo)',
            price: 99.90,
            durationDays: 30,
            servicesIncluded: JSON.stringify({ services: ['Corte'] }),
            isExclusive: true,
            ownerId: jhon.id
        },
        {
            id: 'plan-exclusive-combo',
            name: 'Assinatura Exclusiva - Corte + Barba',
            description: 'Cortes e Barbaterapia ilimitados com Jhon Jhon (Exclusivo)',
            price: 199.90,
            durationDays: 30,
            servicesIncluded: JSON.stringify({ services: ['Corte', 'Barba'] }),
            isExclusive: true,
            ownerId: jhon.id
        },
        {
            id: 'plan-exclusive-barba',
            name: 'Assinatura Exclusiva - Barba',
            description: 'Barbaterapia ilimitada com Jhon Jhon (Exclusivo)',
            price: 99.90,
            durationDays: 30,
            servicesIncluded: JSON.stringify({ services: ['Barba'] }),
            isExclusive: true,
            ownerId: jhon.id
        }
    ];

    for (const plan of plans) {
        console.log(`Upserting plan: ${plan.name}...`);
        await prisma.subscriptionPlan.upsert({
            where: { id: plan.id },
            update: plan,
            create: plan
        });
    }

    console.log('Exclusive plans seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
